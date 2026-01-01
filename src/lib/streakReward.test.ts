import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  claimStreakReward,
  getStreakRewardConfig,
  hasClaimedStreakToday,
  getStreakRewardStats,
} from './iap';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Streak Reward Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getStreakRewardConfig', () => {
    it('returns streak reward configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            config: {
              milestones: [
                { days: 7, credits: 3, name: '7일 연속 방문' },
                { days: 14, credits: 5, name: '14일 연속 방문' },
              ],
              dailyBonus: { interval: 3, credits: 1 },
            },
          }),
      });

      const config = await getStreakRewardConfig();

      expect(config).toEqual({
        milestones: [
          { days: 7, credits: 3, name: '7일 연속 방문' },
          { days: 14, credits: 5, name: '14일 연속 방문' },
        ],
        dailyBonus: { interval: 3, credits: 1 },
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/credits/streak/config')
      );
    });

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const config = await getStreakRewardConfig();

      expect(config).toBeNull();
    });
  });

  describe('claimStreakReward', () => {
    it('claims milestone reward successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            rewards: [{ type: 'milestone', credits: 3, name: '7일 연속 방문' }],
            totalCredits: 3,
            alreadyClaimed: false,
            newBalance: 18,
          }),
      });

      const result = await claimStreakReward('user-key', '20250115', 7);

      expect(result.success).toBe(true);
      expect(result.rewards).toHaveLength(1);
      expect(result.rewards[0].credits).toBe(3);
      expect(result.rewards[0].type).toBe('milestone');
      expect(result.totalCredits).toBe(3);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.newBalance).toBe(18);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/credits/streak/claim'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('user-key'),
        })
      );
    });

    it('claims daily bonus reward', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            rewards: [{ type: 'daily_bonus', credits: 1, name: '3일차 보너스' }],
            totalCredits: 1,
            alreadyClaimed: false,
            newBalance: 11,
          }),
      });

      const result = await claimStreakReward('user-key', '20250115', 3);

      expect(result.success).toBe(true);
      expect(result.rewards).toHaveLength(1);
      expect(result.rewards[0].type).toBe('daily_bonus');
      expect(result.totalCredits).toBe(1);
    });

    it('returns alreadyClaimed=true for duplicate claims', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            rewards: [],
            totalCredits: 0,
            alreadyClaimed: true,
          }),
      });

      const result = await claimStreakReward('user-key', '20250115', 7);

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(true);
      expect(result.totalCredits).toBe(0);
      expect(result.rewards).toHaveLength(0);
    });

    it('returns empty rewards when streak is not eligible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            rewards: [],
            totalCredits: 0,
            alreadyClaimed: false,
          }),
      });

      const result = await claimStreakReward('user-key', '20250115', 2);

      expect(result.success).toBe(true);
      expect(result.rewards).toHaveLength(0);
      expect(result.totalCredits).toBe(0);
    });

    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await claimStreakReward('user-key', '20250115', 7);

      expect(result.success).toBe(false);
      expect(result.rewards).toHaveLength(0);
      expect(result.totalCredits).toBe(0);
    });
  });

  describe('hasClaimedStreakToday', () => {
    it('returns true when already claimed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            claimed: true,
          }),
      });

      const claimed = await hasClaimedStreakToday('user-key', '20250115');

      expect(claimed).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/credits/streak/status?userKey=user-key&dateKey=20250115')
      );
    });

    it('returns false when not claimed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            claimed: false,
          }),
      });

      const claimed = await hasClaimedStreakToday('user-key', '20250115');

      expect(claimed).toBe(false);
    });

    it('returns false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const claimed = await hasClaimedStreakToday('user-key', '20250115');

      expect(claimed).toBe(false);
    });
  });

  describe('getStreakRewardStats', () => {
    it('returns streak reward statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            stats: {
              totalCreditsEarned: 25,
              milestonesReached: [7, 14],
              lastRewardDate: '20250115',
            },
          }),
      });

      const stats = await getStreakRewardStats('user-key');

      expect(stats).toEqual({
        totalCreditsEarned: 25,
        milestonesReached: [7, 14],
        lastRewardDate: '20250115',
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/credits/streak/stats?userKey=user-key'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-User-Key': 'user-key' }),
        })
      );
    });

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const stats = await getStreakRewardStats('user-key');

      expect(stats).toBeNull();
    });
  });
});

describe('Integration: Streak Reward Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('full flow: claim milestone and daily bonus', async () => {
    const userKey = 'user-123';
    const dateKey = '20250115';

    // Day 7: Milestone reward
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          rewards: [{ type: 'milestone', credits: 3, name: '7일 연속 방문' }],
          totalCredits: 3,
          alreadyClaimed: false,
          newBalance: 3,
        }),
    });

    const day7Result = await claimStreakReward(userKey, dateKey, 7);

    expect(day7Result.success).toBe(true);
    expect(day7Result.rewards).toHaveLength(1);
    expect(day7Result.rewards[0].type).toBe('milestone');
    expect(day7Result.totalCredits).toBe(3);

    // Day 9: Daily bonus (3일 단위)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          rewards: [{ type: 'daily_bonus', credits: 1, name: '9일차 보너스' }],
          totalCredits: 1,
          alreadyClaimed: false,
          newBalance: 4,
        }),
    });

    const day9Result = await claimStreakReward(userKey, '20250117', 9);

    expect(day9Result.success).toBe(true);
    expect(day9Result.rewards[0].type).toBe('daily_bonus');
    expect(day9Result.totalCredits).toBe(1);
  });

  it('duplicate claim returns alreadyClaimed', async () => {
    const userKey = 'user-123';
    const dateKey = '20250115';

    // First claim
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          rewards: [{ type: 'milestone', credits: 3, name: '7일 연속 방문' }],
          totalCredits: 3,
          alreadyClaimed: false,
        }),
    });

    await claimStreakReward(userKey, dateKey, 7);

    // Second claim same day
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          rewards: [],
          totalCredits: 0,
          alreadyClaimed: true,
        }),
    });

    const duplicateResult = await claimStreakReward(userKey, dateKey, 7);

    expect(duplicateResult.success).toBe(true);
    expect(duplicateResult.alreadyClaimed).toBe(true);
    expect(duplicateResult.totalCredits).toBe(0);
  });

  it('different day allows new rewards', async () => {
    const userKey = 'user-123';

    // Day 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          rewards: [{ type: 'daily_bonus', credits: 1, name: '3일차 보너스' }],
          totalCredits: 1,
          alreadyClaimed: false,
        }),
    });

    const day1Result = await claimStreakReward(userKey, '20250115', 3);
    expect(day1Result.totalCredits).toBe(1);
    expect(day1Result.alreadyClaimed).toBe(false);

    // Day 2 - different date
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          rewards: [{ type: 'daily_bonus', credits: 1, name: '6일차 보너스' }],
          totalCredits: 1,
          alreadyClaimed: false,
        }),
    });

    const day2Result = await claimStreakReward(userKey, '20250116', 6);
    expect(day2Result.totalCredits).toBe(1);
    expect(day2Result.alreadyClaimed).toBe(false);
  });
});
