/**
 * Redis-based Invite Store
 *
 * Stores invite records with TTL in Redis.
 * Uses optimistic locking (WATCH/MULTI) for atomic updates.
 */

import crypto from 'node:crypto';
import { getRedis } from '../lib/redis.js';
import { withLock } from '../lib/lock.js';
import type { InviteRecord } from '../types.js';
import type { IInviteStore, JoinInviteResult, ReissueInviteResult } from './interface.js';

const INVITE_PREFIX = 'invite:';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cryptographically secure invite ID
 */
function generateInviteId(): string {
  return crypto.randomBytes(12).toString('hex');
}

/**
 * Redis-based invite store implementation
 */
export class RedisInviteStore implements IInviteStore {
  private getKey(inviteId: string): string {
    return `${INVITE_PREFIX}${inviteId}`;
  }

  /**
   * Create a new invite
   */
  async createInvite(inviterKey: string, ttlMs = DEFAULT_TTL_MS): Promise<InviteRecord> {
    const redis = getRedis();
    const inviteId = generateInviteId();
    const now = Date.now();

    const record: InviteRecord = {
      inviteId,
      inviterKey,
      createdAt: now,
      expiresAt: now + ttlMs,
    };

    const key = this.getKey(inviteId);
    const ttlSeconds = Math.ceil(ttlMs / 1000);

    await redis.setex(key, ttlSeconds, JSON.stringify(record));

    return record;
  }

  /**
   * Get an invite by ID
   */
  async getInvite(inviteId: string): Promise<InviteRecord | null> {
    const redis = getRedis();
    const key = this.getKey(inviteId);

    const data = await redis.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as InviteRecord;
    } catch {
      return null;
    }
  }

  /**
   * Join an invite (atomic operation with distributed lock)
   */
  async joinInvite(inviteId: string, userKey: string): Promise<JoinInviteResult> {
    const lockKey = `invite:join:${inviteId}`;

    try {
      return await withLock(lockKey, async () => {
        const redis = getRedis();
        const key = this.getKey(inviteId);
        const now = Date.now();

        const data = await redis.get(key);
        if (!data) {
          return { rec: null };
        }

        const rec: InviteRecord = JSON.parse(data);

        // Check if revoked
        if (rec.revoked) {
          await redis.del(key);
          return { rec: null, status: 'expired' };
        }

        // Check if expired
        if (rec.expiresAt <= now) {
          await redis.del(key);
          return { rec: null, status: 'expired' };
        }

        // Inviter checking their own invite
        if (userKey === rec.inviterKey) {
          const status = rec.inviteeKey ? 'paired' : 'pending';
          return { rec, role: 'inviter', partnerKey: rec.inviteeKey, status };
        }

        // First-come invitee
        if (!rec.inviteeKey) {
          rec.inviteeKey = userKey;

          // Calculate remaining TTL
          const remainingTtlMs = rec.expiresAt - now;
          const remainingTtlSeconds = Math.ceil(remainingTtlMs / 1000);

          await redis.setex(key, remainingTtlSeconds, JSON.stringify(rec));

          return { rec, role: 'invitee', partnerKey: rec.inviterKey, status: 'paired' };
        }

        // Already paired - returning invitee
        if (userKey === rec.inviteeKey) {
          return { rec, role: 'invitee', partnerKey: rec.inviterKey, status: 'paired' };
        }

        // Outsider - invite already used by someone else
        return { rec, status: 'paired', error: 'used' };
      });
    } catch (error) {
      // Lock acquisition failed - concurrent update
      if ((error as Error).name === 'LockAcquisitionError') {
        return { rec: null, error: 'concurrent_update' };
      }
      throw error;
    }
  }

  /**
   * Reissue an invite (revoke old, create new)
   */
  async reissueInvite(
    inviteId: string,
    userKey: string,
    ttlMs = DEFAULT_TTL_MS
  ): Promise<ReissueInviteResult> {
    const lockKey = `invite:reissue:${inviteId}`;

    try {
      return await withLock(lockKey, async () => {
        const redis = getRedis();
        const key = this.getKey(inviteId);
        const now = Date.now();

        const data = await redis.get(key);
        if (!data) {
          return { ok: false, reason: 'not_found' };
        }

        const rec: InviteRecord = JSON.parse(data);

        // Check if expired or revoked
        if (rec.revoked || rec.expiresAt <= now) {
          await redis.del(key);
          return { ok: false, reason: 'expired' };
        }

        // Only inviter can reissue
        if (userKey !== rec.inviterKey) {
          return { ok: false, reason: 'forbidden' };
        }

        // Revoke old invite
        rec.revoked = true;
        await redis.setex(key, 60, JSON.stringify(rec)); // Keep for 60 seconds for cleanup

        // Create new invite
        const newInvite = await this.createInvite(rec.inviterKey, ttlMs);

        return {
          ok: true,
          inviteId: newInvite.inviteId,
          expiresAt: newInvite.expiresAt,
        };
      });
    } catch (error) {
      if ((error as Error).name === 'LockAcquisitionError') {
        return { ok: false, reason: 'not_found' }; // Treat as not found on lock failure
      }
      throw error;
    }
  }

  /**
   * Cleanup expired/revoked invites
   * Note: Redis TTL handles most cleanup automatically.
   * This is mainly for revoked invites that haven't expired yet.
   */
  async cleanup(_now = Date.now()): Promise<void> {
    // Redis handles expiration automatically via TTL
    // Revoked invites are set with a short TTL (60 seconds)
    // No manual cleanup needed
  }
}

/**
 * Create a new Redis invite store instance
 */
export function createInviteStore(): IInviteStore {
  return new RedisInviteStore();
}
