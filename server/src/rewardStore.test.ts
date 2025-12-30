import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RewardStore } from './rewardStore';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('RewardStore', () => {
  let store: RewardStore;
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'soul-lab-reward-test-'));
    store = new RewardStore(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('earn', () => {
    it('creates new reward record', () => {
      const result = store.earn('user1', '20250115', 'daily');

      expect(result.already).toBe(false);
      expect(result.record.userKey).toBe('user1');
      expect(result.record.dateKey).toBe('20250115');
      expect(result.record.scope).toBe('daily');
      expect(result.record.earnedAt).toBeTruthy();
    });

    it('prevents duplicate rewards', () => {
      store.earn('user1', '20250115', 'daily');
      const result = store.earn('user1', '20250115', 'daily');

      expect(result.already).toBe(true);
    });

    it('allows same user different dates', () => {
      store.earn('user1', '20250115', 'daily');
      const result = store.earn('user1', '20250116', 'daily');

      expect(result.already).toBe(false);
    });

    it('allows different users same date', () => {
      store.earn('user1', '20250115', 'daily');
      const result = store.earn('user2', '20250115', 'daily');

      expect(result.already).toBe(false);
    });

    it('stores metadata (ip, ua)', () => {
      const result = store.earn('user1', '20250115', 'daily', {
        ip: '192.168.1.1',
        ua: 'Test Browser',
      });

      expect(result.record.ip).toBe('192.168.1.1');
      expect(result.record.ua).toBe('Test Browser');
    });

    it('handles undefined scope', () => {
      const result = store.earn('user1', '20250115');

      expect(result.already).toBe(false);
      expect(result.record.scope).toBeUndefined();
    });
  });

  describe('cleanupOlderThan', () => {
    it('removes old rewards', () => {
      // Create old reward
      store.earn('user1', '20250101');

      // Cleanup anything older than 7 days
      const now = Date.now();
      store.cleanupOlderThan(7, now + 8 * 24 * 60 * 60 * 1000);

      // Old reward should be gone, try to earn again
      const result = store.earn('user1', '20250101');
      expect(result.already).toBe(false);
    });

    it('keeps recent rewards', () => {
      store.earn('user1', '20250115');

      store.cleanupOlderThan(7);

      const result = store.earn('user1', '20250115');
      expect(result.already).toBe(true);
    });
  });

  describe('persistence', () => {
    it('persists data across instances', () => {
      store.earn('user1', '20250115', 'daily');

      const store2 = new RewardStore(testDir);
      const result = store2.earn('user1', '20250115', 'daily');

      expect(result.already).toBe(true);
    });
  });
});
