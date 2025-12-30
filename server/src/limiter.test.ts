import { describe, it, expect, beforeEach } from 'vitest';
import { FixedWindowLimiter } from './limiter';

describe('FixedWindowLimiter', () => {
  let limiter: FixedWindowLimiter;

  beforeEach(() => {
    limiter = new FixedWindowLimiter();
  });

  describe('allow', () => {
    it('allows first request', () => {
      const result = limiter.allow('user1', 10, 60000);
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('decrements remaining count', () => {
      limiter.allow('user1', 10, 60000);
      const result = limiter.allow('user1', 10, 60000);
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(8);
    });

    it('blocks requests when limit exceeded', () => {
      const limit = 3;
      limiter.allow('user1', limit, 60000);
      limiter.allow('user1', limit, 60000);
      limiter.allow('user1', limit, 60000);

      const result = limiter.allow('user1', limit, 60000);
      expect(result.ok).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('tracks different keys separately', () => {
      limiter.allow('user1', 2, 60000);
      limiter.allow('user1', 2, 60000);

      const user1Result = limiter.allow('user1', 2, 60000);
      const user2Result = limiter.allow('user2', 2, 60000);

      expect(user1Result.ok).toBe(false);
      expect(user2Result.ok).toBe(true);
    });

    it('resets window after time expires', () => {
      const now = 1000000;
      const windowMs = 60000;

      limiter.allow('user1', 2, windowMs, now);
      limiter.allow('user1', 2, windowMs, now);

      // Should be blocked
      const blocked = limiter.allow('user1', 2, windowMs, now);
      expect(blocked.ok).toBe(false);

      // After window expires
      const afterWindow = limiter.allow('user1', 2, windowMs, now + windowMs);
      expect(afterWindow.ok).toBe(true);
      expect(afterWindow.remaining).toBe(1);
    });

    it('returns correct resetAt timestamp', () => {
      const now = 1000000;
      const windowMs = 60000;

      const result = limiter.allow('user1', 10, windowMs, now);
      expect(result.resetAt).toBe(now + windowMs);
    });

    it('remaining never goes negative', () => {
      const limit = 2;
      limiter.allow('user1', limit, 60000);
      limiter.allow('user1', limit, 60000);
      limiter.allow('user1', limit, 60000);
      limiter.allow('user1', limit, 60000);

      const result = limiter.allow('user1', limit, 60000);
      expect(result.remaining).toBe(0);
    });

    it('handles limit of 1', () => {
      const result1 = limiter.allow('user1', 1, 60000);
      expect(result1.ok).toBe(true);
      expect(result1.remaining).toBe(0);

      const result2 = limiter.allow('user1', 1, 60000);
      expect(result2.ok).toBe(false);
    });

    it('handles large limits', () => {
      const limit = 10000;
      const result = limiter.allow('user1', limit, 60000);
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(limit - 1);
    });
  });

  describe('sweep', () => {
    it('removes expired buckets', () => {
      const now = 1000000;
      const windowMs = 60000;

      // Create bucket
      limiter.allow('user1', 10, windowMs, now);

      // Bucket should still exist after single window
      limiter.sweep(windowMs, now + windowMs);

      // Bucket should be removed after 2x window
      limiter.sweep(windowMs, now + windowMs * 2 + 1);

      // New request should create fresh bucket
      const result = limiter.allow('user1', 10, windowMs, now + windowMs * 2 + 1);
      expect(result.ok).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('keeps recent buckets', () => {
      const now = 1000000;
      const windowMs = 60000;

      limiter.allow('user1', 10, windowMs, now);
      limiter.allow('user1', 10, windowMs, now);

      limiter.sweep(windowMs, now + windowMs);

      // Should continue from previous count
      const result = limiter.allow('user1', 10, windowMs, now);
      expect(result.remaining).toBe(7);
    });
  });
});
