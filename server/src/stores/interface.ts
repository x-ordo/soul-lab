/**
 * Store Interfaces
 *
 * Abstract interfaces for all data stores to enable
 * swapping implementations (Redis, SQLite, etc.)
 */

import type { InviteRecord, InviteStatus } from '../types.js';

// ============================================================
// Invite Store Interface
// ============================================================

export interface JoinInviteResult {
  rec: InviteRecord | null;
  role?: 'inviter' | 'invitee';
  partnerKey?: string;
  status?: InviteStatus;
  error?: 'used' | 'concurrent_update';
}

export interface ReissueInviteResult {
  ok: boolean;
  reason?: 'not_found' | 'expired' | 'forbidden';
  inviteId?: string;
  expiresAt?: number;
}

export interface IInviteStore {
  createInvite(inviterKey: string, ttlMs: number): Promise<InviteRecord>;
  getInvite(inviteId: string): Promise<InviteRecord | null>;
  joinInvite(inviteId: string, userKey: string): Promise<JoinInviteResult>;
  reissueInvite(inviteId: string, userKey: string, ttlMs: number): Promise<ReissueInviteResult>;
  cleanup(now?: number): Promise<void>;
}

// ============================================================
// Reward Store Interface
// ============================================================

export interface RewardRecord {
  key: string;
  userKey: string;
  dateKey: string;
  scope?: string;
  earnedAt: number;
  ip?: string;
  ua?: string;
}

export interface EarnRewardResult {
  already: boolean;
  record: RewardRecord;
}

export interface IRewardStore {
  earn(
    userKey: string,
    dateKey: string,
    scope?: string,
    meta?: { ip?: string; ua?: string }
  ): Promise<EarnRewardResult>;
  getByKey(key: string): Promise<RewardRecord | null>;
  cleanupOlderThan(days: number, now?: number): Promise<void>;
}

// ============================================================
// Credit Store Interface
// ============================================================

export interface CreditBalance {
  userKey: string;
  credits: number;
  totalPurchased: number;
  totalUsed: number;
  lastUpdated: string;
}

export interface CreditTransaction {
  id: string;
  userKey: string;
  type: 'purchase' | 'use' | 'refund' | 'bonus';
  amount: number;
  balance: number;
  description: string;
  orderId?: string;
  sku?: string;
  timestamp: string;
}

export interface PurchaseRecord {
  orderId: string;
  userKey: string;
  sku: string;
  credits: number;
  amount: number;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: string;
  completedAt?: string;
}

export interface ReferralRecord {
  id: string;
  inviterKey: string;
  inviteeKey: string;
  dateKey: string;
  inviterCredited: boolean;
  inviteeCredited: boolean;
  createdAt: string;
}

export interface StreakRewardRecord {
  id: string;
  userKey: string;
  dateKey: string;
  streak: number;
  rewardType: 'milestone' | 'daily_bonus';
  credits: number;
  createdAt: string;
}

export interface UseCreditsResult {
  success: boolean;
  transaction?: CreditTransaction;
  error?: string;
}

export interface CompletePurchaseResult {
  success: boolean;
  purchase?: PurchaseRecord;
  transaction?: CreditTransaction;
  error?: string;
}

export interface ClaimReferralResult {
  success: boolean;
  credits?: number;
  alreadyClaimed?: boolean;
  error?: string;
  transaction?: CreditTransaction;
}

export interface ClaimStreakResult {
  success: boolean;
  rewards: Array<{ type: 'milestone' | 'daily_bonus'; credits: number; name: string }>;
  totalCredits: number;
  alreadyClaimed: boolean;
}

export interface ICreditStore {
  // Balance
  getBalance(userKey: string): Promise<CreditBalance>;
  hasEnoughCredits(userKey: string, amount: number): Promise<boolean>;

  // Credits
  addCredits(
    userKey: string,
    amount: number,
    type: 'purchase' | 'bonus' | 'refund',
    description: string,
    orderId?: string,
    sku?: string
  ): Promise<CreditTransaction>;
  useCredits(userKey: string, amount: number, description: string): Promise<UseCreditsResult>;

  // Purchases
  createPurchase(orderId: string, userKey: string, sku: string, amount: number): Promise<PurchaseRecord>;
  completePurchase(orderId: string): Promise<CompletePurchaseResult>;
  getPurchase(orderId: string): Promise<PurchaseRecord | undefined>;
  getUserPurchases(userKey: string): Promise<PurchaseRecord[]>;
  getPendingPurchases(userKey: string): Promise<PurchaseRecord[]>;

  // Transactions
  getTransactionHistory(userKey: string, limit?: number): Promise<CreditTransaction[]>;

  // Referrals
  claimReferralReward(
    inviterKey: string,
    inviteeKey: string,
    dateKey: string,
    claimerKey: string
  ): Promise<ClaimReferralResult>;
  getReferralStatus(inviterKey: string, inviteeKey: string, dateKey: string): Promise<ReferralRecord | null>;
  getReferralStats(userKey: string): Promise<{ totalInvited: number; totalCreditsEarned: number }>;

  // Streaks
  claimStreakReward(userKey: string, dateKey: string, streak: number): Promise<ClaimStreakResult>;
  getStreakRewardHistory(userKey: string, limit?: number): Promise<StreakRewardRecord[]>;
  getStreakRewardStats(userKey: string): Promise<{
    totalCreditsEarned: number;
    milestonesReached: number[];
    lastRewardDate: string | null;
  }>;
  hasClaimedStreakRewardToday(userKey: string, dateKey: string): Promise<boolean>;
}
