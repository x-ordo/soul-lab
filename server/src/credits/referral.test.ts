import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { CreditStore, REFERRAL_REWARDS } from './store.js';

describe('CreditStore - Referral Rewards', () => {
  let store: CreditStore;
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'soul-lab-referral-test-'));
    store = new CreditStore(testDir);
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('claimReferralReward', () => {
    it('grants inviter reward correctly', () => {
      const result = store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      expect(result.success).toBe(true);
      expect(result.credits).toBe(REFERRAL_REWARDS.inviterCredits);
      expect(result.alreadyClaimed).toBe(false);

      // Check balance
      const balance = store.getBalance('inviter-key');
      expect(balance.credits).toBe(REFERRAL_REWARDS.inviterCredits);
    });

    it('grants invitee reward correctly', () => {
      const result = store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'invitee-key'
      );

      expect(result.success).toBe(true);
      expect(result.credits).toBe(REFERRAL_REWARDS.inviteeCredits);
      expect(result.alreadyClaimed).toBe(false);

      // Check balance
      const balance = store.getBalance('invitee-key');
      expect(balance.credits).toBe(REFERRAL_REWARDS.inviteeCredits);
    });

    it('prevents same user from claiming', () => {
      const result = store.claimReferralReward(
        'same-key',
        'same-key',
        '20250115',
        'same-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('same_user');
    });

    it('prevents unauthorized claimer', () => {
      const result = store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'outsider-key'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('unauthorized_claimer');
    });

    it('prevents duplicate claims for inviter', () => {
      // First claim
      store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      // Second claim
      const result = store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(true);
      expect(result.credits).toBe(0);

      // Balance should not increase
      const balance = store.getBalance('inviter-key');
      expect(balance.credits).toBe(REFERRAL_REWARDS.inviterCredits);
    });

    it('prevents duplicate claims for invitee', () => {
      // First claim
      store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'invitee-key'
      );

      // Second claim
      const result = store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'invitee-key'
      );

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(true);
      expect(result.credits).toBe(0);

      // Balance should not increase
      const balance = store.getBalance('invitee-key');
      expect(balance.credits).toBe(REFERRAL_REWARDS.inviteeCredits);
    });

    it('allows both inviter and invitee to claim', () => {
      // Inviter claims
      const inviterResult = store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      // Invitee claims
      const inviteeResult = store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'invitee-key'
      );

      expect(inviterResult.success).toBe(true);
      expect(inviterResult.credits).toBe(REFERRAL_REWARDS.inviterCredits);
      expect(inviteeResult.success).toBe(true);
      expect(inviteeResult.credits).toBe(REFERRAL_REWARDS.inviteeCredits);

      // Check balances
      expect(store.getBalance('inviter-key').credits).toBe(REFERRAL_REWARDS.inviterCredits);
      expect(store.getBalance('invitee-key').credits).toBe(REFERRAL_REWARDS.inviteeCredits);
    });

    it('allows new rewards on different dates', () => {
      // Day 1
      store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      // Day 2
      const result = store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250116',
        'inviter-key'
      );

      expect(result.success).toBe(true);
      expect(result.alreadyClaimed).toBe(false);
      expect(result.credits).toBe(REFERRAL_REWARDS.inviterCredits);

      // Balance should be doubled
      const balance = store.getBalance('inviter-key');
      expect(balance.credits).toBe(REFERRAL_REWARDS.inviterCredits * 2);
    });

    it('creates transaction record', () => {
      store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      const history = store.getTransactionHistory('inviter-key');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('bonus');
      expect(history[0].amount).toBe(REFERRAL_REWARDS.inviterCredits);
      expect(history[0].description).toContain('친구 초대 보상');
    });
  });

  describe('getReferralStatus', () => {
    it('returns null for non-existent referral', () => {
      const status = store.getReferralStatus(
        'inviter-key',
        'invitee-key',
        '20250115'
      );

      expect(status).toBeNull();
    });

    it('returns status after claim', () => {
      store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      const status = store.getReferralStatus(
        'inviter-key',
        'invitee-key',
        '20250115'
      );

      expect(status).not.toBeNull();
      expect(status?.inviterCredited).toBe(true);
      expect(status?.inviteeCredited).toBe(false);
    });

    it('tracks both parties credited', () => {
      store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );
      store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'invitee-key'
      );

      const status = store.getReferralStatus(
        'inviter-key',
        'invitee-key',
        '20250115'
      );

      expect(status?.inviterCredited).toBe(true);
      expect(status?.inviteeCredited).toBe(true);
    });
  });

  describe('getReferralStats', () => {
    it('returns zero stats for new user', () => {
      const stats = store.getReferralStats('new-user');

      expect(stats.totalInvited).toBe(0);
      expect(stats.totalCreditsEarned).toBe(0);
    });

    it('tracks inviter stats correctly', () => {
      // Invite 3 different people
      store.claimReferralReward('inviter', 'invitee1', '20250115', 'inviter');
      store.claimReferralReward('inviter', 'invitee2', '20250115', 'inviter');
      store.claimReferralReward('inviter', 'invitee3', '20250115', 'inviter');

      const stats = store.getReferralStats('inviter');

      expect(stats.totalInvited).toBe(3);
      expect(stats.totalCreditsEarned).toBe(REFERRAL_REWARDS.inviterCredits * 3);
    });

    it('tracks invitee stats correctly', () => {
      // Accept invite
      store.claimReferralReward('inviter', 'invitee', '20250115', 'invitee');

      const stats = store.getReferralStats('invitee');

      expect(stats.totalInvited).toBe(0);
      expect(stats.totalCreditsEarned).toBe(REFERRAL_REWARDS.inviteeCredits);
    });

    it('tracks combined stats for user who is both inviter and invitee', () => {
      // User invites someone
      store.claimReferralReward('user', 'friend1', '20250115', 'user');

      // User accepts another invite
      store.claimReferralReward('friend2', 'user', '20250115', 'user');

      const stats = store.getReferralStats('user');

      expect(stats.totalInvited).toBe(1);
      expect(stats.totalCreditsEarned).toBe(
        REFERRAL_REWARDS.inviterCredits + REFERRAL_REWARDS.inviteeCredits
      );
    });
  });

  describe('Persistence', () => {
    it('persists referral data across store instances', () => {
      // Claim reward
      store.claimReferralReward(
        'inviter-key',
        'invitee-key',
        '20250115',
        'inviter-key'
      );

      // Create new store instance with same directory
      const newStore = new CreditStore(testDir);

      // Check data persisted
      const status = newStore.getReferralStatus(
        'inviter-key',
        'invitee-key',
        '20250115'
      );

      expect(status?.inviterCredited).toBe(true);

      // Check balance persisted
      const balance = newStore.getBalance('inviter-key');
      expect(balance.credits).toBe(REFERRAL_REWARDS.inviterCredits);
    });
  });
});

describe('REFERRAL_REWARDS Configuration', () => {
  it('has expected inviter reward', () => {
    expect(REFERRAL_REWARDS.inviterCredits).toBe(5);
  });

  it('has expected invitee reward', () => {
    expect(REFERRAL_REWARDS.inviteeCredits).toBe(3);
  });

  it('inviter reward is greater than invitee reward', () => {
    expect(REFERRAL_REWARDS.inviterCredits).toBeGreaterThan(
      REFERRAL_REWARDS.inviteeCredits
    );
  });
});
