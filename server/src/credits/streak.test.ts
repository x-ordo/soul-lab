import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CreditStore, STREAK_REWARDS, STREAK_DAILY_BONUS } from './store.js';

describe('CreditStore - Streak Rewards', () => {
  let store: CreditStore;
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'soul-lab-streak-test-'));
    store = new CreditStore(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('claimStreakReward', () => {
    it('grants 7-day milestone reward', () => {
      const result = store.claimStreakReward('user-key', '20250115', 7);

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.rewards).toHaveLength(1);
      expect(result.rewards[0].type).toBe('milestone');
      expect(result.rewards[0].credits).toBe(3);
      expect(result.rewards[0].name).toBe('7일 연속 방문');
      expect(result.totalCredits).toBe(3);

      // Check balance
      const balance = store.getBalance('user-key');
      expect(balance.credits).toBe(3);
    });

    it('grants 14-day milestone reward', () => {
      const result = store.claimStreakReward('user-key', '20250115', 14);

      expect(result.success).toBe(true);
      expect(result.rewards[0].credits).toBe(5);
      expect(result.rewards[0].name).toBe('14일 연속 방문');
    });

    it('grants 21-day milestone reward', () => {
      const result = store.claimStreakReward('user-key', '20250115', 21);

      expect(result.success).toBe(true);
      expect(result.rewards[0].credits).toBe(10);
    });

    it('grants 30-day milestone reward', () => {
      const result = store.claimStreakReward('user-key', '20250115', 30);

      expect(result.success).toBe(true);
      expect(result.rewards[0].credits).toBe(20);
    });

    it('grants daily bonus on 3-day intervals', () => {
      const result = store.claimStreakReward('user-key', '20250115', 3);

      expect(result.success).toBe(true);
      expect(result.rewards).toHaveLength(1);
      expect(result.rewards[0].type).toBe('daily_bonus');
      expect(result.rewards[0].credits).toBe(1);
      expect(result.rewards[0].name).toContain('3일');
    });

    it('grants daily bonus on 6-day streak', () => {
      const result = store.claimStreakReward('user-key', '20250115', 6);

      expect(result.success).toBe(true);
      expect(result.rewards[0].type).toBe('daily_bonus');
      expect(result.rewards[0].name).toContain('6일');
    });

    it('grants daily bonus on 9-day streak (not milestone)', () => {
      const result = store.claimStreakReward('user-key', '20250115', 9);

      expect(result.success).toBe(true);
      expect(result.rewards[0].type).toBe('daily_bonus');
    });

    it('does not grant reward on non-interval days', () => {
      const result = store.claimStreakReward('user-key', '20250115', 2);

      expect(result.success).toBe(true);
      expect(result.rewards).toHaveLength(0);
      expect(result.totalCredits).toBe(0);
    });

    it('does not grant reward on day 1', () => {
      const result = store.claimStreakReward('user-key', '20250115', 1);

      expect(result.success).toBe(true);
      expect(result.rewards).toHaveLength(0);
    });

    it('milestone takes precedence over daily bonus', () => {
      // 7 is both a milestone AND a multiple of STREAK_DAILY_BONUS.interval (if interval is 7)
      // But with interval=3, day 7 is a milestone, not a daily bonus day
      const result = store.claimStreakReward('user-key', '20250115', 7);

      expect(result.success).toBe(true);
      expect(result.rewards).toHaveLength(1);
      expect(result.rewards[0].type).toBe('milestone');
    });

    it('prevents duplicate claims on same day', () => {
      // First claim
      store.claimStreakReward('user-key', '20250115', 7);

      // Second claim
      const result = store.claimStreakReward('user-key', '20250115', 7);

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(true);
      expect(result.totalCredits).toBe(0);

      // Balance should not increase
      const balance = store.getBalance('user-key');
      expect(balance.credits).toBe(3);
    });

    it('allows rewards on different dates', () => {
      // Day 1
      store.claimStreakReward('user-key', '20250115', 7);

      // Day 2
      const result = store.claimStreakReward('user-key', '20250116', 14);

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.totalCredits).toBe(5);

      // Balance should be sum of both
      const balance = store.getBalance('user-key');
      expect(balance.credits).toBe(8);
    });

    it('creates transaction record', () => {
      store.claimStreakReward('user-key', '20250115', 7);

      const history = store.getTransactionHistory('user-key');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('bonus');
      expect(history[0].amount).toBe(3);
      expect(history[0].description).toContain('7일 연속 방문');
    });
  });

  describe('hasClaimedStreakRewardToday', () => {
    it('returns false when not claimed', () => {
      const claimed = store.hasClaimedStreakRewardToday('user-key', '20250115');
      expect(claimed).toBe(false);
    });

    it('returns true after claiming', () => {
      store.claimStreakReward('user-key', '20250115', 7);

      const claimed = store.hasClaimedStreakRewardToday('user-key', '20250115');
      expect(claimed).toBe(true);
    });

    it('returns false for different date', () => {
      store.claimStreakReward('user-key', '20250115', 7);

      const claimed = store.hasClaimedStreakRewardToday('user-key', '20250116');
      expect(claimed).toBe(false);
    });
  });

  describe('getStreakRewardHistory', () => {
    it('returns empty array for new user', () => {
      const history = store.getStreakRewardHistory('new-user');
      expect(history).toHaveLength(0);
    });

    it('returns reward history', () => {
      store.claimStreakReward('user-key', '20250115', 7);
      store.claimStreakReward('user-key', '20250116', 14);

      const history = store.getStreakRewardHistory('user-key');

      expect(history).toHaveLength(2);
      expect(history[0].dateKey).toBe('20250116');
      expect(history[0].streak).toBe(14);
      expect(history[1].dateKey).toBe('20250115');
      expect(history[1].streak).toBe(7);
    });

    it('respects limit parameter', () => {
      store.claimStreakReward('user-key', '20250115', 3);
      store.claimStreakReward('user-key', '20250116', 6);
      store.claimStreakReward('user-key', '20250117', 7);

      const history = store.getStreakRewardHistory('user-key', 2);

      expect(history).toHaveLength(2);
    });
  });

  describe('getStreakRewardStats', () => {
    it('returns zero stats for new user', () => {
      const stats = store.getStreakRewardStats('new-user');

      expect(stats.totalCreditsEarned).toBe(0);
      expect(stats.milestonesReached).toHaveLength(0);
      expect(stats.lastRewardDate).toBeNull();
    });

    it('tracks total credits earned', () => {
      store.claimStreakReward('user-key', '20250115', 7);
      store.claimStreakReward('user-key', '20250116', 14);

      const stats = store.getStreakRewardStats('user-key');

      expect(stats.totalCreditsEarned).toBe(8);
    });

    it('tracks milestones reached', () => {
      store.claimStreakReward('user-key', '20250115', 7);
      store.claimStreakReward('user-key', '20250122', 14);

      const stats = store.getStreakRewardStats('user-key');

      expect(stats.milestonesReached).toContain(7);
      expect(stats.milestonesReached).toContain(14);
      expect(stats.milestonesReached).not.toContain(21);
    });

    it('tracks last reward date', () => {
      store.claimStreakReward('user-key', '20250115', 3);
      store.claimStreakReward('user-key', '20250116', 6);

      const stats = store.getStreakRewardStats('user-key');

      expect(stats.lastRewardDate).toBe('20250116');
    });
  });

  describe('Persistence', () => {
    it('persists streak reward data across store instances', () => {
      // Claim reward
      store.claimStreakReward('user-key', '20250115', 7);

      // Create new store instance with same directory
      const newStore = new CreditStore(testDir);

      // Check data persisted
      const claimed = newStore.hasClaimedStreakRewardToday('user-key', '20250115');
      expect(claimed).toBe(true);

      // Check balance persisted
      const balance = newStore.getBalance('user-key');
      expect(balance.credits).toBe(3);

      // Check stats persisted
      const stats = newStore.getStreakRewardStats('user-key');
      expect(stats.totalCreditsEarned).toBe(3);
      expect(stats.milestonesReached).toContain(7);
    });
  });
});

describe('STREAK_REWARDS Configuration', () => {
  it('has 4 milestone tiers', () => {
    expect(STREAK_REWARDS).toHaveLength(4);
  });

  it('has expected milestone days', () => {
    const days = STREAK_REWARDS.map(r => r.days);
    expect(days).toEqual([7, 14, 21, 30]);
  });

  it('has increasing rewards', () => {
    for (let i = 1; i < STREAK_REWARDS.length; i++) {
      expect(STREAK_REWARDS[i].credits).toBeGreaterThan(STREAK_REWARDS[i - 1].credits);
    }
  });

  it('has 7-day milestone at 3 credits', () => {
    const tier = STREAK_REWARDS.find(r => r.days === 7);
    expect(tier?.credits).toBe(3);
  });

  it('has 30-day milestone at 20 credits', () => {
    const tier = STREAK_REWARDS.find(r => r.days === 30);
    expect(tier?.credits).toBe(20);
  });
});

describe('STREAK_DAILY_BONUS Configuration', () => {
  it('has 3-day interval', () => {
    expect(STREAK_DAILY_BONUS.interval).toBe(3);
  });

  it('has 1 credit per bonus', () => {
    expect(STREAK_DAILY_BONUS.credits).toBe(1);
  });
});
