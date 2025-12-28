/**
 * Local-only reward ledger (no server, no cost).
 * This is NOT security — it's an audit-ish log to reduce accidental abuse.
 */
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

export function hasEarnedReward(dateKey: string, scope: string): boolean {
  const ledger = getLedger();
  return !!ledger?.[dateKey]?.[scope];
}

export function markRewardEarned(dateKey: string, scope: string) {
  const ledger = getLedger();
  ledger[dateKey] = ledger[dateKey] ?? {};
  ledger[dateKey][scope] = Date.now();
  setLedger(ledger);
}
