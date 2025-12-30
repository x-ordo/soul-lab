import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  claimReferralReward,
  getReferralRewards,
  getReferralStats,
} from './iap';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Referral Reward Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getReferralRewards', () => {
    it('returns reward configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            rewards: {
              inviterCredits: 5,
              inviteeCredits: 3,
            },
          }),
      });

      const rewards = await getReferralRewards();

      expect(rewards).toEqual({
        inviterCredits: 5,
        inviteeCredits: 3,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/credits/referral/rewards')
      );
    });

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const rewards = await getReferralRewards();

      expect(rewards).toBeNull();
    });
  });

  describe('claimReferralReward', () => {
    it('claims reward for inviter successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            credits: 5,
            alreadyClaimed: false,
            newBalance: 15,
          }),
      });

      const result = await claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      expect(result.success).toBe(true);
      expect(result.credits).toBe(5);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.newBalance).toBe(15);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/credits/referral/claim'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('inviter-key'),
        })
      );
    });

    it('claims reward for invitee successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            credits: 3,
            alreadyClaimed: false,
            newBalance: 8,
          }),
      });

      const result = await claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'invitee-key'
      );

      expect(result.success).toBe(true);
      expect(result.credits).toBe(3);
      expect(result.alreadyClaimed).toBe(false);
    });

    it('returns alreadyClaimed=true for duplicate claims', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            credits: 0,
            alreadyClaimed: true,
          }),
      });

      const result = await claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(true);
      expect(result.credits).toBe(0);
    });

    it('returns error for unauthorized claimer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'unauthorized_claimer' }),
      });

      const result = await claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'outsider-key' // Not inviter or invitee
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('unauthorized_claimer');
    });

    it('returns error for same user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'same_user' }),
      });

      const result = await claimReferralReward(
        'same-key',
        'same-key',
        '20250115',
        'same-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('same_user');
    });

    it('returns network_error on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('network_error');
    });
  });

  describe('getReferralStats', () => {
    it('returns referral statistics', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            stats: {
              totalInvited: 5,
              totalCreditsEarned: 40,
            },
          }),
      });

      const stats = await getReferralStats('user-key');

      expect(stats).toEqual({
        totalInvited: 5,
        totalCreditsEarned: 40,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/credits/referral/stats?userKey=user-key')
      );
    });

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const stats = await getReferralStats('user-key');

      expect(stats).toBeNull();
    });
  });
});

describe('Integration: Referral Reward Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('full flow: both inviter and invitee claim rewards', async () => {
    const inviterKey = 'inviter-123';
    const inviteeKey = 'invitee-456';
    const dateKey = '20250115';

    // Step 1: Inviter claims reward
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          credits: 5,
          alreadyClaimed: false,
          newBalance: 5,
        }),
    });

    const inviterResult = await claimReferralReward(
      inviterKey,
      inviteeKey,
      dateKey,
      inviterKey
    );

    expect(inviterResult.success).toBe(true);
    expect(inviterResult.credits).toBe(5);
    expect(inviterResult.alreadyClaimed).toBe(false);

    // Step 2: Invitee claims reward
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          credits: 3,
          alreadyClaimed: false,
          newBalance: 3,
        }),
    });

    const inviteeResult = await claimReferralReward(
      inviterKey,
      inviteeKey,
      dateKey,
      inviteeKey
    );

    expect(inviteeResult.success).toBe(true);
    expect(inviteeResult.credits).toBe(3);
    expect(inviteeResult.alreadyClaimed).toBe(false);

    // Step 3: Inviter tries to claim again
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          credits: 0,
          alreadyClaimed: true,
        }),
    });

    const duplicateResult = await claimReferralReward(
      inviterKey,
      inviteeKey,
      dateKey,
      inviterKey
    );

    expect(duplicateResult.success).toBe(true);
    expect(duplicateResult.alreadyClaimed).toBe(true);
    expect(duplicateResult.credits).toBe(0);
  });

  it('different date allows new rewards', async () => {
    const inviterKey = 'inviter-123';
    const inviteeKey = 'invitee-456';

    // Day 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          credits: 5,
          alreadyClaimed: false,
        }),
    });

    const day1Result = await claimReferralReward(
      inviterKey,
      inviteeKey,
      '20250115',
      inviterKey
    );

    expect(day1Result.credits).toBe(5);
    expect(day1Result.alreadyClaimed).toBe(false);

    // Day 2 - same pair, different date
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          credits: 5,
          alreadyClaimed: false,
        }),
    });

    const day2Result = await claimReferralReward(
      inviterKey,
      inviteeKey,
      '20250116',
      inviterKey
    );

    expect(day2Result.credits).toBe(5);
    expect(day2Result.alreadyClaimed).toBe(false);
  });
});
