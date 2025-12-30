import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileStore } from './store';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('FileStore', () => {
  let store: FileStore;
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'soul-lab-test-'));
    store = new FileStore(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('createInvite', () => {
    it('creates an invite with required fields', () => {
      const invite = store.createInvite('user1', 86400000);

      expect(invite.inviteId).toBeTruthy();
      expect(invite.inviterKey).toBe('user1');
      expect(invite.createdAt).toBeTruthy();
      expect(invite.expiresAt).toBeGreaterThan(invite.createdAt);
    });

    it('generates unique invite IDs', () => {
      const invite1 = store.createInvite('user1', 86400000);
      const invite2 = store.createInvite('user1', 86400000);

      expect(invite1.inviteId).not.toBe(invite2.inviteId);
    });

    it('sets correct TTL', () => {
      const ttlMs = 3600000; // 1 hour
      const now = Date.now();
      const invite = store.createInvite('user1', ttlMs);

      expect(invite.expiresAt).toBeGreaterThanOrEqual(now + ttlMs - 100);
      expect(invite.expiresAt).toBeLessThanOrEqual(now + ttlMs + 100);
    });
  });

  describe('getInvite', () => {
    it('returns null for non-existent invite', () => {
      expect(store.getInvite('nonexistent')).toBeNull();
    });

    it('returns existing invite', () => {
      const created = store.createInvite('user1', 86400000);
      const retrieved = store.getInvite(created.inviteId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.inviteId).toBe(created.inviteId);
      expect(retrieved?.inviterKey).toBe('user1');
    });
  });

  describe('joinInvite', () => {
    it('returns null for non-existent invite', () => {
      const result = store.joinInvite('nonexistent', 'user2');
      expect(result.rec).toBeNull();
    });

    it('allows inviter to check their invite (pending)', () => {
      const invite = store.createInvite('user1', 86400000);
      const result = store.joinInvite(invite.inviteId, 'user1');

      expect(result.rec).not.toBeNull();
      expect(result.role).toBe('inviter');
      expect(result.status).toBe('pending');
    });

    it('allows invitee to join pending invite', () => {
      const invite = store.createInvite('user1', 86400000);
      const result = store.joinInvite(invite.inviteId, 'user2');

      expect(result.rec).not.toBeNull();
      expect(result.role).toBe('invitee');
      expect(result.partnerKey).toBe('user1');
      expect(result.status).toBe('paired');
    });

    it('shows paired status to inviter after join', () => {
      const invite = store.createInvite('user1', 86400000);
      store.joinInvite(invite.inviteId, 'user2');

      const result = store.joinInvite(invite.inviteId, 'user1');
      expect(result.status).toBe('paired');
      expect(result.partnerKey).toBe('user2');
    });

    it('allows invitee to rejoin their paired invite', () => {
      const invite = store.createInvite('user1', 86400000);
      store.joinInvite(invite.inviteId, 'user2');

      const result = store.joinInvite(invite.inviteId, 'user2');
      expect(result.role).toBe('invitee');
      expect(result.status).toBe('paired');
    });

    it('blocks third party from joining paired invite', () => {
      const invite = store.createInvite('user1', 86400000);
      store.joinInvite(invite.inviteId, 'user2');

      const result = store.joinInvite(invite.inviteId, 'user3');
      expect(result.error).toBe('used');
    });

    it('returns expired status for expired invite', async () => {
      const invite = store.createInvite('user1', 1); // 1ms TTL
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 10));
      const result = store.joinInvite(invite.inviteId, 'user2');

      // Either expired status or null record (cleaned up)
      expect(result.rec === null || result.status === 'expired').toBe(true);
    });
  });

  describe('reissueInvite', () => {
    it('returns not_found for non-existent invite', () => {
      const result = store.reissueInvite('nonexistent', 'user1', 86400000);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('not_found');
      }
    });

    it('returns forbidden for non-owner', () => {
      const invite = store.createInvite('user1', 86400000);
      const result = store.reissueInvite(invite.inviteId, 'user2', 86400000);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('forbidden');
      }
    });

    it('creates new invite and revokes old one', () => {
      const oldInvite = store.createInvite('user1', 86400000);
      const result = store.reissueInvite(oldInvite.inviteId, 'user1', 86400000);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.inviteId).not.toBe(oldInvite.inviteId);
        expect(result.expiresAt).toBeTruthy();
      }

      // Old invite should be revoked
      const oldResult = store.joinInvite(oldInvite.inviteId, 'user2');
      expect(oldResult.rec).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('removes expired invites', () => {
      const invite = store.createInvite('user1', 1); // 1ms TTL

      // Wait a bit for expiration
      const now = Date.now() + 100;
      store.cleanup(now);

      expect(store.getInvite(invite.inviteId)).toBeNull();
    });

    it('keeps valid invites', () => {
      const invite = store.createInvite('user1', 86400000);

      store.cleanup();

      expect(store.getInvite(invite.inviteId)).not.toBeNull();
    });
  });

  describe('persistence', () => {
    it('persists data across instances', () => {
      const invite = store.createInvite('user1', 86400000);
      store.joinInvite(invite.inviteId, 'user2');

      // Create new instance
      const store2 = new FileStore(testDir);
      const retrieved = store2.getInvite(invite.inviteId);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.inviteeKey).toBe('user2');
    });
  });
});
