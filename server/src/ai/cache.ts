/**
 * AI Response Cache
 *
 * Redis-based caching for AI responses to reduce API costs.
 * Cache keys are hashed from request parameters.
 */

import crypto from 'node:crypto';
import { getRedis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import type { AIResponse } from './provider.js';

// Cache key prefix
const CACHE_PREFIX = 'ai:cache:';

// TTL configurations (in seconds)
const TTL = {
  daily_fortune: 24 * 60 * 60, // 24 hours
  tarot_reading: 7 * 24 * 60 * 60, // 7 days
  synastry: 7 * 24 * 60 * 60, // 7 days
  chat: 60 * 60, // 1 hour (less cacheable)
  default: 24 * 60 * 60, // 24 hours
} as const;

export type CacheType = keyof typeof TTL;

interface CachedResponse extends AIResponse {
  cachedAt: string;
  cacheHit: boolean;
}

/**
 * Generate a cache key from input parameters
 */
function generateCacheKey(params: Record<string, unknown>): string {
  const normalized = JSON.stringify(params, Object.keys(params).sort());
  const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Get cached AI response
 */
export async function getCachedResponse(
  cacheKey: string
): Promise<CachedResponse | null> {
  try {
    const redis = getRedis();
    const data = await redis.get(cacheKey);

    if (!data) return null;

    const cached = JSON.parse(data) as CachedResponse;
    cached.cacheHit = true;

    logger.debug({ cacheKey }, 'ai_cache_hit');
    return cached;
  } catch (err) {
    logger.warn({ err, cacheKey }, 'ai_cache_get_error');
    return null;
  }
}

/**
 * Cache an AI response
 */
export async function cacheResponse(
  cacheKey: string,
  response: AIResponse,
  type: CacheType = 'default'
): Promise<void> {
  try {
    const redis = getRedis();
    const ttl = TTL[type];

    const cached: CachedResponse = {
      ...response,
      cachedAt: new Date().toISOString(),
      cacheHit: false,
    };

    await redis.setex(cacheKey, ttl, JSON.stringify(cached));

    logger.debug({ cacheKey, ttl, type }, 'ai_cache_set');
  } catch (err) {
    logger.warn({ err, cacheKey }, 'ai_cache_set_error');
  }
}

/**
 * Build cache key for daily fortune
 */
export function buildDailyFortuneKey(params: {
  userKey?: string;
  birthdate?: string;
  dateKey: string;
  zodiacSign?: string;
}): string {
  return generateCacheKey({
    type: 'daily_fortune',
    ...params,
  });
}

/**
 * Build cache key for tarot reading
 */
export function buildTarotCacheKey(params: {
  userKey?: string;
  spreadType: string;
  cardIds: string[];
  question?: string;
}): string {
  return generateCacheKey({
    type: 'tarot_reading',
    ...params,
  });
}

/**
 * Build cache key for synastry analysis
 */
export function buildSynastryCacheKey(params: {
  birthdate1: string;
  birthdate2: string;
}): string {
  // Sort birthdates to ensure same pair always has same key
  const sorted = [params.birthdate1, params.birthdate2].sort();
  return generateCacheKey({
    type: 'synastry',
    birthdate1: sorted[0],
    birthdate2: sorted[1],
  });
}

/**
 * Build cache key for chat
 */
export function buildChatCacheKey(params: {
  userKey?: string;
  question: string;
  zodiacSign?: string;
}): string {
  return generateCacheKey({
    type: 'chat',
    ...params,
  });
}

/**
 * Wrapper for cached AI calls
 */
export async function withCache<T extends AIResponse>(
  cacheKey: string,
  cacheType: CacheType,
  fetchFn: () => Promise<T>
): Promise<T & { cacheHit: boolean }> {
  // Try cache first
  const cached = await getCachedResponse(cacheKey);
  if (cached) {
    // Double assertion needed: CachedResponse -> unknown -> T
    return cached as unknown as T & { cacheHit: boolean };
  }

  // Call AI
  const response = await fetchFn();

  // Cache the response
  await cacheResponse(cacheKey, response, cacheType);

  return { ...response, cacheHit: false };
}

/**
 * Invalidate cache for a specific key
 */
export async function invalidateCache(cacheKey: string): Promise<boolean> {
  try {
    const redis = getRedis();
    const deleted = await redis.del(cacheKey);
    return deleted > 0;
  } catch (err) {
    logger.warn({ err, cacheKey }, 'ai_cache_invalidate_error');
    return false;
  }
}

/**
 * Get cache statistics (for monitoring)
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  memoryUsage: string;
}> {
  try {
    const redis = getRedis();

    // Count AI cache keys
    let totalKeys = 0;
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `${CACHE_PREFIX}*`, 'COUNT', 1000);
      cursor = newCursor;
      totalKeys += keys.length;
    } while (cursor !== '0');

    // Get memory info
    const info = await redis.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

    return { totalKeys, memoryUsage };
  } catch (err) {
    logger.warn({ err }, 'ai_cache_stats_error');
    return { totalKeys: 0, memoryUsage: 'unknown' };
  }
}
