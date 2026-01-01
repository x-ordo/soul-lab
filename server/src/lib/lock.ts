/**
 * Distributed Lock using Redis
 *
 * Provides a simple distributed lock mechanism using Redis SETNX.
 * Suitable for single-Redis setups. For multi-Redis (cluster),
 * consider using Redlock algorithm.
 */

import crypto from 'node:crypto';
import { getRedis } from './redis.js';

const DEFAULT_LOCK_TTL_MS = 5000; // 5 seconds
const LOCK_PREFIX = 'lock:';

// Lua scripts for atomic operations (executed on Redis server)
const RELEASE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
`;

const EXTEND_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('pexpire', KEYS[1], ARGV[2])
else
  return 0
end
`;

/**
 * Lock acquisition error
 */
export class LockAcquisitionError extends Error {
  constructor(key: string) {
    super(`Failed to acquire lock for key: ${key}`);
    this.name = 'LockAcquisitionError';
  }
}

/**
 * Execute Lua script on Redis
 * Using 'call' method to run EVAL command
 */
async function runLuaScript(
  script: string,
  keys: string[],
  args: (string | number)[]
): Promise<unknown> {
  const redis = getRedis();
  // Use call method to execute Redis EVAL command
  return redis.call('EVAL', script, keys.length, ...keys, ...args);
}

/**
 * Acquire a distributed lock
 *
 * @param key - The resource key to lock
 * @param ttlMs - Lock TTL in milliseconds (auto-release timeout)
 * @returns Lock ID for release, or null if lock couldn't be acquired
 */
export async function acquireLock(key: string, ttlMs = DEFAULT_LOCK_TTL_MS): Promise<string | null> {
  const redis = getRedis();
  const lockKey = `${LOCK_PREFIX}${key}`;
  const lockId = crypto.randomBytes(16).toString('hex');

  // SETNX with TTL - atomic lock acquisition
  const result = await redis.set(lockKey, lockId, 'PX', ttlMs, 'NX');

  return result === 'OK' ? lockId : null;
}

/**
 * Release a distributed lock
 *
 * Only releases if the lock is held by the caller (lockId matches)
 *
 * @param key - The resource key
 * @param lockId - The lock ID returned from acquireLock
 * @returns true if lock was released, false otherwise
 */
export async function releaseLock(key: string, lockId: string): Promise<boolean> {
  const lockKey = `${LOCK_PREFIX}${key}`;
  const result = await runLuaScript(RELEASE_SCRIPT, [lockKey], [lockId]);
  return result === 1;
}

/**
 * Execute a function with a distributed lock
 *
 * Automatically acquires lock before execution and releases after.
 * Throws LockAcquisitionError if lock cannot be acquired.
 *
 * @param key - The resource key to lock
 * @param fn - The async function to execute while holding the lock
 * @param ttlMs - Lock TTL in milliseconds
 * @returns The result of the function
 */
export async function withLock<T>(
  key: string,
  fn: () => T | Promise<T>,
  ttlMs = DEFAULT_LOCK_TTL_MS
): Promise<T> {
  const lockId = await acquireLock(key, ttlMs);

  if (!lockId) {
    throw new LockAcquisitionError(key);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key, lockId);
  }
}

/**
 * Try to execute a function with a distributed lock
 *
 * Unlike withLock, this doesn't throw if lock can't be acquired.
 * Returns null instead.
 *
 * @param key - The resource key to lock
 * @param fn - The async function to execute while holding the lock
 * @param ttlMs - Lock TTL in milliseconds
 * @returns The result of the function, or null if lock couldn't be acquired
 */
export async function tryWithLock<T>(
  key: string,
  fn: () => T | Promise<T>,
  ttlMs = DEFAULT_LOCK_TTL_MS
): Promise<{ success: true; result: T } | { success: false; error: 'lock_failed' }> {
  const lockId = await acquireLock(key, ttlMs);

  if (!lockId) {
    return { success: false, error: 'lock_failed' };
  }

  try {
    const result = await fn();
    return { success: true, result };
  } finally {
    await releaseLock(key, lockId);
  }
}

/**
 * Extend a lock's TTL
 *
 * Useful for long-running operations that need more time
 *
 * @param key - The resource key
 * @param lockId - The lock ID
 * @param ttlMs - New TTL in milliseconds
 * @returns true if lock was extended, false if lock not held
 */
export async function extendLock(key: string, lockId: string, ttlMs: number): Promise<boolean> {
  const lockKey = `${LOCK_PREFIX}${key}`;
  const result = await runLuaScript(EXTEND_SCRIPT, [lockKey], [lockId, ttlMs]);
  return result === 1;
}
