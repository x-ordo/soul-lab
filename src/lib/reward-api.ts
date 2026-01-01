/**
 * Reward API client for server-side validation.
 * Rewards must be recorded on server before unlocking content.
 */

const API_BASE = import.meta.env.VITE_API_BASE || '';

export interface RewardEarnRequest {
  userKey: string;
  dateKey: string;
  scope?: string;
}

export interface RewardEarnResponse {
  ok: boolean;
  already: boolean;
  error?: string;
}

export interface RewardCheckResponse {
  earned: boolean;
  earnedAt?: number;
}

/**
 * Record reward on server - MUST succeed before unlocking content.
 * Returns { ok: true } on success, { ok: false, error } on failure.
 */
export async function earnRewardServer(
  req: RewardEarnRequest
): Promise<RewardEarnResponse> {
  try {
    const res = await fetch(`${API_BASE}/api/rewards/earn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    if (res.status === 429) {
      return { ok: false, already: false, error: 'rate_limited' };
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        ok: false,
        already: false,
        error: data.error || `http_${res.status}`,
      };
    }

    const data = await res.json();
    return { ok: true, already: data.already ?? false };
  } catch (err) {
    console.error('[earnRewardServer] Network error:', err);
    return {
      ok: false,
      already: false,
      error: 'network_error',
    };
  }
}

/**
 * Check if reward was already earned for today (optional optimization).
 * Used for pre-checking before showing ad.
 */
export async function checkRewardServer(
  userKey: string,
  dateKey: string,
  scope?: string
): Promise<RewardCheckResponse> {
  try {
    const params = new URLSearchParams({ userKey, dateKey });
    if (scope) params.set('scope', scope);

    const res = await fetch(`${API_BASE}/api/rewards/check?${params}`);
    if (!res.ok) return { earned: false };

    const data = await res.json();
    return {
      earned: data.earned ?? false,
      earnedAt: data.earnedAt,
    };
  } catch {
    return { earned: false };
  }
}
