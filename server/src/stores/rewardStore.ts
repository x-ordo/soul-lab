/**
 * Redis-based Reward Store
 *
 * Tracks reward earnings with daily keys.
 * Uses Redis SET for efficient duplicate detection.
 */

import { getRedis } from '../lib/redis.js';
import { withLock } from '../lib/lock.js';
import type { IRewardStore, RewardRecord, EarnRewardResult } from './interface.js';

const REWARD_PREFIX = 'reward:';
const REWARD_SET_PREFIX = 'rewards:set:';
const DEFAULT_RETENTION_DAYS = 90;

/**
 * Redis-based reward store implementation
 */
export class RedisRewardStore implements IRewardStore {
  private retentionDays: number;

  constructor(retentionDays = DEFAULT_RETENTION_DAYS) {
    this.retentionDays = retentionDays;
  }

  private getKey(userKey: string, dateKey: string): string {
    return `${REWARD_PREFIX}${userKey}:${dateKey}`;
  }

  private getSetKey(dateKey: string): string {
    return `${REWARD_SET_PREFIX}${dateKey}`;
  }

  /**
   * Earn a reward (atomic operation with distributed lock)
   */
  async earn(
    userKey: string,
    dateKey: string,
    scope?: string,
    meta?: { ip?: string; ua?: string }
  ): Promise<EarnRewardResult> {
    const lockKey = `reward:earn:${userKey}:${dateKey}`;

    return await withLock(lockKey, async () => {
      const redis = getRedis();
      const key = this.getKey(userKey, dateKey);

      // Check if already earned
      const existing = await redis.get(key);
      if (existing) {
        return { already: true, record: JSON.parse(existing) as RewardRecord };
      }

      // Create new reward record
      const record: RewardRecord = {
        key: `${userKey}:${dateKey}`,
        userKey,
        dateKey,
        scope,
        earnedAt: Date.now(),
        ip: meta?.ip,
        ua: meta?.ua,
      };

      // Store with TTL (retention period)
      const ttlSeconds = this.retentionDays * 24 * 60 * 60;
      await redis.setex(key, ttlSeconds, JSON.stringify(record));

      // Also add to daily set for efficient date-based queries
      const setKey = this.getSetKey(dateKey);
      await redis.sadd(setKey, userKey);
      await redis.expire(setKey, ttlSeconds);

      return { already: false, record };
    });
  }

  /**
   * Check if user has earned reward today
   */
  async hasEarnedToday(userKey: string, dateKey: string): Promise<boolean> {
    const redis = getRedis();
    const key = this.getKey(userKey, dateKey);
    const exists = await redis.exists(key);
    return exists === 1;
  }

  /**
   * Get reward record
   */
  async getReward(userKey: string, dateKey: string): Promise<RewardRecord | null> {
    const redis = getRedis();
    const key = this.getKey(userKey, dateKey);
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as RewardRecord;
  }

  /**
   * Get reward record by composite key (userKey:dateKey)
   */
  async getByKey(compositeKey: string): Promise<RewardRecord | null> {
    const redis = getRedis();
    const key = `${REWARD_PREFIX}${compositeKey}`;
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as RewardRecord;
  }

  /**
   * Cleanup old rewards
   * Note: Redis TTL handles cleanup automatically.
   * This method is provided for interface compatibility.
   */
  async cleanupOlderThan(_days: number, _now = Date.now()): Promise<void> {
    // Redis handles expiration automatically via TTL
    // No manual cleanup needed
  }

  /**
   * Get count of rewards for a specific date
   */
  async getDateCount(dateKey: string): Promise<number> {
    const redis = getRedis();
    const setKey = this.getSetKey(dateKey);
    return await redis.scard(setKey);
  }
}

/**
 * Create a new Redis reward store instance
 */
export function createRewardStore(retentionDays = DEFAULT_RETENTION_DAYS): IRewardStore {
  return new RedisRewardStore(retentionDays);
}
