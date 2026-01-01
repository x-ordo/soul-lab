/**
 * Redis Client Library
 *
 * Provides a singleton Redis client with:
 * - Upstash Redis support (via REDIS_URL)
 * - Local Redis fallback
 * - Connection health checks
 * - Graceful shutdown
 */

import Redis from 'ioredis';
import { isDevelopment } from '../config/index.js';

let _redis: Redis | null = null;

/**
 * Get or create the Redis client singleton
 */
export function getRedis(): Redis {
  if (_redis) return _redis;

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (isDevelopment()) {
      // Development: connect to local Redis
      console.warn('[Redis] REDIS_URL not set, using localhost:6379');
      _redis = new Redis({
        host: 'localhost',
        port: 6379,
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });
    } else {
      // Production: REDIS_URL is required
      throw new Error('REDIS_URL environment variable is required in production');
    }
  } else {
    // Parse Upstash or standard Redis URL
    _redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
      // Upstash requires TLS
      tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    });
  }

  _redis.on('connect', () => {
    console.log('[Redis] Connected');
  });

  _redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
  });

  _redis.on('close', () => {
    console.log('[Redis] Connection closed');
  });

  return _redis;
}

/**
 * Check if Redis is healthy
 */
export async function isRedisHealthy(): Promise<boolean> {
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
    console.log('[Redis] Connection closed gracefully');
  }
}

/**
 * Reset Redis client (for testing)
 */
export function resetRedis(): void {
  if (_redis) {
    _redis.disconnect();
    _redis = null;
  }
}

// Re-export Redis type for convenience
export { Redis };
