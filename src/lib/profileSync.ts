/**
 * Profile sync utilities for server-side birthdate storage.
 * Enables cross-device continuity and data lock-in.
 */
import { getEffectiveUserKey, getBirthDate, getAgreement } from './storage';

const API_BASE = import.meta.env.VITE_API_BASE || '';

interface ProfileSyncInput {
  userKey: string;
  birthdate: string;
  consents: {
    terms: boolean;
    thirdParty: boolean;
    marketing: boolean;
  };
  consentedAt?: string;
  tossPublicKey?: string;
}

interface ProfileSyncResponse {
  success: boolean;
  synced?: boolean;
  profile?: {
    userKey: string;
    createdAt?: string;
    updatedAt?: string;
  };
  error?: string;
}

/**
 * Sync profile to server after user consent.
 * Non-blocking, fire-and-forget with retry.
 */
export async function syncProfileToServer(
  input: ProfileSyncInput
): Promise<ProfileSyncResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Key': input.userKey,
      },
      body: JSON.stringify({
        userKey: input.userKey,
        birthdate: input.birthdate,
        consents: input.consents,
        consentedAt: input.consentedAt || new Date().toISOString(),
        tossPublicKey: input.tossPublicKey,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `http_${res.status}` };
    }

    const data = await res.json();
    return {
      success: true,
      synced: true,
      profile: data.profile,
    };
  } catch (err) {
    console.error('[syncProfileToServer] Failed:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'network_error',
    };
  }
}

/**
 * Migrate existing localStorage profile to server.
 * For users who agreed before server-side storage was implemented.
 */
export async function migrateExistingProfile(): Promise<boolean> {
  const userKey = getEffectiveUserKey();
  const birthdate = getBirthDate();
  const agreement = getAgreement();

  if (!birthdate || !agreement?.terms) {
    return false; // Nothing to migrate
  }

  // Check if server already has profile
  try {
    const checkRes = await fetch(`${API_BASE}/api/profile?userKey=${encodeURIComponent(userKey)}`, {
      headers: { 'X-User-Key': userKey },
    });

    if (checkRes.ok) {
      const data = await checkRes.json();
      if (data.profile?.birthdate) {
        return true; // Already migrated
      }
    }
  } catch {
    // Continue with migration attempt
  }

  // Sync to server
  try {
    const res = await fetch(`${API_BASE}/api/profile/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Key': userKey,
      },
      body: JSON.stringify({
        userKey,
        birthdate,
        consents: {
          terms: agreement.terms,
          thirdParty: agreement.thirdParty ?? false,
          marketing: agreement.marketing ?? false,
        },
        consentedAt: new Date(agreement.at).toISOString(),
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn('[migrateExistingProfile] Failed:', err);
    return false;
  }
}

/**
 * Restore profile from server to localStorage.
 * Used when user accesses from new device with Toss login.
 */
export async function restoreProfileFromServer(userKey: string): Promise<{
  birthdate: string;
  consents: {
    terms: boolean;
    thirdParty: boolean;
    marketing: boolean;
  };
} | null> {
  try {
    const res = await fetch(`${API_BASE}/api/profile?userKey=${encodeURIComponent(userKey)}`, {
      headers: { 'X-User-Key': userKey },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.profile?.birthdate) return null;

    return {
      birthdate: data.profile.birthdate,
      consents: {
        terms: data.profile.consents.terms,
        thirdParty: data.profile.consents.thirdParty,
        marketing: data.profile.consents.marketing,
      },
    };
  } catch {
    return null;
  }
}
