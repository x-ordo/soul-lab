/**
 * Reward ledger with server validation.
 * Server is source of truth; localStorage is cache for quick checks.
 */
import { earnRewardServer } from './reward-api';

type RewardLedger = Record<string, Record<string, number>>; // dateKey -> scope -> timestamp

const K_REWARD_LEDGER = 'soul_lab:reward_ledger_v1';

function getLedger(): RewardLedger {
  try {
    const raw = localStorage.getItem(K_REWARD_LEDGER);
    if (!raw) return {};
    return JSON.parse(raw) as RewardLedger;
  } catch {
    return {};
  }
}

function setLedger(ledger: RewardLedger) {
  localStorage.setItem(K_REWARD_LEDGER, JSON.stringify(ledger));
}

/**
 * Check if reward was earned (local cache only - fast path).
 */
export function hasEarnedReward(dateKey: string, scope: string): boolean {
  const ledger = getLedger();
  return !!ledger?.[dateKey]?.[scope];
}

/**
 * Mark reward as earned in local cache only.
 * Use this after server confirms the reward.
 */
function markRewardEarnedLocal(dateKey: string, scope: string) {
  const ledger = getLedger();
  ledger[dateKey] = ledger[dateKey] ?? {};
  ledger[dateKey][scope] = Date.now();
  setLedger(ledger);
}

export interface MarkRewardResult {
  success: boolean;
  already: boolean;
  error?: string;
}

/**
 * Mark reward as earned with server validation.
 * Server call must succeed before caching locally.
 *
 * @param userKey - User identifier (from getEffectiveUserKey)
 * @param dateKey - Date key (e.g., '20251231')
 * @param scope - Reward scope (e.g., 'detail', 'daily')
 * @returns Result with success status
 */
export async function markRewardEarned(
  userKey: string,
  dateKey: string,
  scope: string
): Promise<MarkRewardResult> {
  try {
    const result = await earnRewardServer({ userKey, dateKey, scope });

    if (result.ok || result.already) {
      // Server confirmed - cache locally for fast subsequent checks
      markRewardEarnedLocal(dateKey, scope);
      return { success: true, already: result.already };
    }

    return { success: false, already: false, error: result.error };
  } catch (err) {
    console.error('[markRewardEarned] Server call failed:', err);
    return {
      success: false,
      already: false,
      error: err instanceof Error ? err.message : 'unknown_error',
    };
  }
}

/**
 * @deprecated Use markRewardEarned with server validation instead.
 * This bypasses server validation and should only be used for migration.
 */
export function markRewardEarnedLocalOnly(dateKey: string, scope: string) {
  markRewardEarnedLocal(dateKey, scope);
}
