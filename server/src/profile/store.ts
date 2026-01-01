/**
 * ProfileStore - Server-side user profile storage with encryption.
 * Stores birthdate and consent information for cross-device continuity.
 */
import fs from 'node:fs';
import path from 'node:path';
import { encrypt, decrypt, hash, isEncryptionConfigured } from '../lib/crypto.js';
import { writeFileAtomic } from '../lib/atomicWrite.js';
import * as mutex from '../lib/mutex.js';

// ============================================================
// Types
// ============================================================

export interface UserConsent {
  terms: boolean;
  thirdParty: boolean;
  marketing: boolean;
  consentedAt: number; // Unix timestamp
  version: string; // Consent version (e.g., "v1")
}

export interface UserProfile {
  userKey: string;
  birthdateEncrypted: string; // AES-256-GCM encrypted YYYYMMDD
  birthdateHash: string; // SHA-256 for analytics
  consents: UserConsent;
  tossPublicKey?: string; // Toss identity if logged in
  linkedKeys?: string[]; // Other userKeys linked to same identity
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  lastActiveAt: string; // For retention analytics
}

export interface CreateProfileInput {
  userKey: string;
  birthdate: string; // YYYYMMDD
  consents: {
    terms: boolean;
    thirdParty: boolean;
    marketing: boolean;
  };
  consentedAt?: string; // ISO timestamp
  tossPublicKey?: string;
}

export interface ProfileResponse {
  userKey: string;
  birthdate: string; // Decrypted
  consents: UserConsent;
  syncedAt: string;
}

type DB = { profiles: Record<string, UserProfile> };

// ============================================================
// Store Implementation
// ============================================================

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export class ProfileStore {
  private filePath: string;
  private db: DB;

  constructor(dataDir: string) {
    ensureDir(dataDir);
    this.filePath = path.join(dataDir, 'user_profiles.json');
    this.db = this.load();
  }

  private load(): DB {
    try {
      if (!fs.existsSync(this.filePath)) return { profiles: {} };
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as DB;
      if (!parsed.profiles) return { profiles: {} };
      return parsed;
    } catch {
      return { profiles: {} };
    }
  }

  private save() {
    writeFileAtomic(this.filePath, JSON.stringify(this.db, null, 2));
  }

  /**
   * Create or update user profile (internal, no mutex).
   */
  private createOrUpdateInternal(input: CreateProfileInput): UserProfile {
    if (!isEncryptionConfigured()) {
      throw new Error('Encryption not configured. Set PROFILE_ENCRYPTION_KEY.');
    }

    const now = new Date().toISOString();
    const existing = this.db.profiles[input.userKey];

    const profile: UserProfile = {
      userKey: input.userKey,
      birthdateEncrypted: encrypt(input.birthdate),
      birthdateHash: hash(input.birthdate),
      consents: {
        terms: input.consents.terms,
        thirdParty: input.consents.thirdParty,
        marketing: input.consents.marketing,
        consentedAt: input.consentedAt
          ? new Date(input.consentedAt).getTime()
          : Date.now(),
        version: 'v1',
      },
      tossPublicKey: input.tossPublicKey || existing?.tossPublicKey,
      linkedKeys: existing?.linkedKeys,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastActiveAt: now,
    };

    this.db.profiles[input.userKey] = profile;
    this.save();

    return profile;
  }

  /**
   * Create or update user profile with mutex protection.
   */
  async createOrUpdate(input: CreateProfileInput): Promise<UserProfile> {
    return mutex.withLock(`profile:${input.userKey}`, () => {
      return this.createOrUpdateInternal(input);
    });
  }

  /**
   * Get profile by userKey (read-only, no side effects).
   */
  get(userKey: string): ProfileResponse | null {
    const profile = this.db.profiles[userKey];
    if (!profile) return null;

    try {
      return {
        userKey: profile.userKey,
        birthdate: decrypt(profile.birthdateEncrypted),
        consents: profile.consents,
        syncedAt: profile.updatedAt,
      };
    } catch (err) {
      console.error(`[ProfileStore] Failed to decrypt profile for ${userKey}:`, err);
      return null;
    }
  }

  /**
   * Update last active timestamp (call separately when needed).
   */
  updateLastActive(userKey: string): void {
    const profile = this.db.profiles[userKey];
    if (!profile) return;

    profile.lastActiveAt = new Date().toISOString();
    this.save();
  }

  /**
   * Get raw profile (without decryption).
   */
  getRaw(userKey: string): UserProfile | null {
    return this.db.profiles[userKey] || null;
  }

  /**
   * Check if profile exists.
   */
  exists(userKey: string): boolean {
    return !!this.db.profiles[userKey];
  }

  /**
   * Delete profile (GDPR compliance).
   */
  delete(userKey: string): boolean {
    if (!this.db.profiles[userKey]) return false;
    delete this.db.profiles[userKey];
    this.save();
    return true;
  }

  /**
   * Link Toss publicKey to device userKey.
   * Enables cross-device profile recovery.
   */
  linkTossKey(deviceUserKey: string, tossPublicKey: string): boolean {
    const profile = this.db.profiles[deviceUserKey];
    if (!profile) return false;

    profile.tossPublicKey = tossPublicKey;
    profile.linkedKeys = profile.linkedKeys || [];
    if (!profile.linkedKeys.includes(tossPublicKey)) {
      profile.linkedKeys.push(tossPublicKey);
    }

    // Also index by Toss key for lookup
    if (!this.db.profiles[tossPublicKey]) {
      this.db.profiles[tossPublicKey] = profile;
    }

    this.save();
    return true;
  }

  /**
   * Get profile by Toss publicKey.
   */
  getByTossKey(tossPublicKey: string): ProfileResponse | null {
    // First check direct lookup
    const direct = this.db.profiles[tossPublicKey];
    if (direct) return this.get(tossPublicKey);

    // Search linked keys
    for (const profile of Object.values(this.db.profiles)) {
      if (profile.tossPublicKey === tossPublicKey) {
        return this.get(profile.userKey);
      }
    }

    return null;
  }

  /**
   * Get profile count (for analytics).
   */
  count(): number {
    return Object.keys(this.db.profiles).length;
  }

  /**
   * Get profiles by birthdate hash (for cohort analysis).
   */
  getByBirthdateHash(birthdateHash: string): string[] {
    return Object.values(this.db.profiles)
      .filter((p) => p.birthdateHash === birthdateHash)
      .map((p) => p.userKey);
  }
}
