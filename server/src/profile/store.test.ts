import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Test encryption key (32 bytes = 64 hex chars)
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Mock config before importing store
vi.mock('../config/index.js', () => ({
  getConfig: vi.fn(() => ({
    PROFILE_ENCRYPTION_KEY: TEST_KEY,
    DATA_ENCRYPTION_KEY: undefined,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
  })),
  isProduction: vi.fn(() => false),
  isDevelopment: vi.fn(() => false),
}));

// Mock logger to suppress output
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { ProfileStore, type CreateProfileInput } from './store.js';

describe('ProfileStore', () => {
  let store: ProfileStore;
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'profile-store-test-'));
    store = new ProfileStore(testDir);
  });

  afterEach(async () => {
    // Allow pending writes to complete
    await new Promise((r) => setTimeout(r, 50));
    try {
      if (existsSync(testDir)) {
        rmSync(testDir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
    vi.clearAllMocks();
  });

  describe('createOrUpdate', () => {
    it('creates a new profile', async () => {
      const input: CreateProfileInput = {
        userKey: 'user123',
        birthdate: '19900115',
        consents: {
          terms: true,
          thirdParty: true,
          marketing: false,
        },
      };

      const profile = await store.createOrUpdate(input);

      expect(profile.userKey).toBe('user123');
      expect(profile.birthdateEncrypted).toContain('aes-256-gcm');
      expect(profile.birthdateHash).toHaveLength(64);
      expect(profile.consents.terms).toBe(true);
      expect(profile.consents.marketing).toBe(false);
      expect(profile.createdAt).toBeTruthy();
    });

    it('encrypts birthdate', async () => {
      const input: CreateProfileInput = {
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      };

      const profile = await store.createOrUpdate(input);

      // Encrypted format should not contain the original birthdate
      expect(profile.birthdateEncrypted).not.toContain('19900115');
      expect(profile.birthdateEncrypted).toMatch(/^aes-256-gcm:/);
    });

    it('updates existing profile', async () => {
      const input1: CreateProfileInput = {
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      };
      const input2: CreateProfileInput = {
        userKey: 'user123',
        birthdate: '19900116', // Changed birthdate
        consents: { terms: true, thirdParty: true, marketing: true }, // Changed marketing
      };

      await store.createOrUpdate(input1);
      const profile = await store.createOrUpdate(input2);

      expect(profile.consents.marketing).toBe(true);
      // createdAt should be preserved
      expect(profile.createdAt).toBeTruthy();
    });

    it('sets consent timestamp', async () => {
      const input: CreateProfileInput = {
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
        consentedAt: '2024-01-15T10:00:00Z',
      };

      const profile = await store.createOrUpdate(input);

      expect(profile.consents.consentedAt).toBe(new Date('2024-01-15T10:00:00Z').getTime());
    });
  });

  describe('get', () => {
    it('returns null for non-existent profile', () => {
      const result = store.get('nonexistent');
      expect(result).toBeNull();
    });

    it('decrypts birthdate when retrieving', async () => {
      const input: CreateProfileInput = {
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      };

      await store.createOrUpdate(input);
      const result = store.get('user123');

      expect(result?.birthdate).toBe('19900115');
    });

    it('returns consents with profile', async () => {
      const input: CreateProfileInput = {
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: false, marketing: true },
      };

      await store.createOrUpdate(input);
      const result = store.get('user123');

      expect(result?.consents.terms).toBe(true);
      expect(result?.consents.thirdParty).toBe(false);
      expect(result?.consents.marketing).toBe(true);
    });
  });

  describe('exists', () => {
    it('returns false for non-existent profile', () => {
      expect(store.exists('nonexistent')).toBe(false);
    });

    it('returns true for existing profile', async () => {
      await store.createOrUpdate({
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      });

      expect(store.exists('user123')).toBe(true);
    });
  });

  describe('delete', () => {
    it('returns false for non-existent profile', () => {
      expect(store.delete('nonexistent')).toBe(false);
    });

    it('deletes existing profile', async () => {
      await store.createOrUpdate({
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      });

      const deleted = store.delete('user123');

      expect(deleted).toBe(true);
      expect(store.exists('user123')).toBe(false);
    });
  });

  describe('count', () => {
    it('returns 0 for empty store', () => {
      expect(store.count()).toBe(0);
    });

    it('returns correct count', async () => {
      await store.createOrUpdate({
        userKey: 'user1',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      });
      await store.createOrUpdate({
        userKey: 'user2',
        birthdate: '19900116',
        consents: { terms: true, thirdParty: true, marketing: false },
      });

      expect(store.count()).toBe(2);
    });
  });

  describe('linkTossKey', () => {
    it('returns false for non-existent profile', () => {
      expect(store.linkTossKey('nonexistent', 'toss123')).toBe(false);
    });

    it('links Toss key to profile', async () => {
      await store.createOrUpdate({
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      });

      const linked = store.linkTossKey('user123', 'toss123');

      expect(linked).toBe(true);
      const raw = store.getRaw('user123');
      expect(raw?.tossPublicKey).toBe('toss123');
    });
  });

  describe('getByTossKey', () => {
    it('returns null for non-existent Toss key', () => {
      expect(store.getByTossKey('nonexistent')).toBeNull();
    });

    it('finds profile by Toss key', async () => {
      await store.createOrUpdate({
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      });
      store.linkTossKey('user123', 'toss123');

      const result = store.getByTossKey('toss123');

      expect(result?.userKey).toBe('user123');
      expect(result?.birthdate).toBe('19900115');
    });
  });

  describe('getByBirthdateHash', () => {
    it('returns empty array when no matches', () => {
      const result = store.getByBirthdateHash('nonexistent');
      expect(result).toEqual([]);
    });

    it('finds profiles with same birthdate', async () => {
      await store.createOrUpdate({
        userKey: 'user1',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      });
      await store.createOrUpdate({
        userKey: 'user2',
        birthdate: '19900115', // Same birthdate
        consents: { terms: true, thirdParty: true, marketing: false },
      });
      await store.createOrUpdate({
        userKey: 'user3',
        birthdate: '19900116', // Different birthdate
        consents: { terms: true, thirdParty: true, marketing: false },
      });

      const raw = store.getRaw('user1');
      const result = store.getByBirthdateHash(raw!.birthdateHash);

      expect(result).toHaveLength(2);
      expect(result).toContain('user1');
      expect(result).toContain('user2');
    });
  });

  describe('persistence', () => {
    it('persists data across instances', async () => {
      await store.createOrUpdate({
        userKey: 'user123',
        birthdate: '19900115',
        consents: { terms: true, thirdParty: true, marketing: false },
      });

      // Wait for file write
      await new Promise((r) => setTimeout(r, 100));

      // Create new instance
      const store2 = new ProfileStore(testDir);
      const result = store2.get('user123');

      expect(result?.birthdate).toBe('19900115');
    });
  });

  describe('security', () => {
    it('rejects dangerous keys (prototype pollution)', async () => {
      await expect(
        store.createOrUpdate({
          userKey: '__proto__',
          birthdate: '19900115',
          consents: { terms: true, thirdParty: true, marketing: false },
        })
      ).rejects.toThrow('Invalid key');
    });

    it('rejects constructor key', async () => {
      await expect(
        store.createOrUpdate({
          userKey: 'constructor',
          birthdate: '19900115',
          consents: { terms: true, thirdParty: true, marketing: false },
        })
      ).rejects.toThrow('Invalid key');
    });
  });
});
