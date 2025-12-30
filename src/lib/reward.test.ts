import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hasEarnedReward, markRewardEarned } from './reward';

describe('hasEarnedReward', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when no rewards earned', () => {
    expect(hasEarnedReward('20250115', 'daily')).toBe(false);
  });

  it('returns false for different dateKey', () => {
    markRewardEarned('20250114', 'daily');
    expect(hasEarnedReward('20250115', 'daily')).toBe(false);
  });

  it('returns false for different scope', () => {
    markRewardEarned('20250115', 'daily');
    expect(hasEarnedReward('20250115', 'bonus')).toBe(false);
  });

  it('returns true after marking reward', () => {
    markRewardEarned('20250115', 'daily');
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
  });

  it('handles corrupted JSON', () => {
    localStorage.setItem('soul_lab:reward_ledger_v1', '{invalid}');
    expect(hasEarnedReward('20250115', 'daily')).toBe(false);
  });
});

describe('markRewardEarned', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('marks reward as earned', () => {
    markRewardEarned('20250115', 'daily');
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
  });

  it('stores timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

    markRewardEarned('20250115', 'daily');

    const raw = localStorage.getItem('soul_lab:reward_ledger_v1');
    const ledger = JSON.parse(raw!);
    expect(ledger['20250115']['daily']).toBe(Date.now());

    vi.useRealTimers();
  });

  it('allows multiple scopes on same date', () => {
    markRewardEarned('20250115', 'daily');
    markRewardEarned('20250115', 'bonus');
    markRewardEarned('20250115', 'referral');

    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
    expect(hasEarnedReward('20250115', 'bonus')).toBe(true);
    expect(hasEarnedReward('20250115', 'referral')).toBe(true);
  });

  it('allows same scope on different dates', () => {
    markRewardEarned('20250114', 'daily');
    markRewardEarned('20250115', 'daily');
    markRewardEarned('20250116', 'daily');

    expect(hasEarnedReward('20250114', 'daily')).toBe(true);
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
    expect(hasEarnedReward('20250116', 'daily')).toBe(true);
  });

  it('is idempotent - marking twice does not error', () => {
    markRewardEarned('20250115', 'daily');
    expect(() => markRewardEarned('20250115', 'daily')).not.toThrow();
    expect(hasEarnedReward('20250115', 'daily')).toBe(true);
  });

  it('preserves existing rewards when adding new one', () => {
    markRewardEarned('20250114', 'daily');
    markRewardEarned('20250115', 'bonus');

    expect(hasEarnedReward('20250114', 'daily')).toBe(true);
    expect(hasEarnedReward('20250115', 'bonus')).toBe(true);
  });
});
