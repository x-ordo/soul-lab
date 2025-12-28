import fs from 'node:fs';
import path from 'node:path';
import { InviteRecord } from './types';

type DB = {
  invites: Record<string, InviteRecord>;
};

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export class FileStore {
  private filePath: string;
  private db: DB;

  constructor(dataDir: string) {
    ensureDir(dataDir);
    this.filePath = path.join(dataDir, 'invites.json');
    this.db = this.load();
  }

  private load(): DB {
    try {
      if (!fs.existsSync(this.filePath)) {
        return { invites: {} };
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as DB;
      if (!parsed.invites) return { invites: {} };
      return parsed;
    } catch {
      return { invites: {} };
    }
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.db, null, 2), 'utf-8');
  }

  cleanup(now = Date.now()) {
    let changed = false;
    for (const [id, rec] of Object.entries(this.db.invites)) {
      if (rec.revoked) {
        delete this.db.invites[id];
        changed = true;
        continue;
      }
      if (rec.expiresAt <= now) {
        delete this.db.invites[id];
        changed = true;
      }
    }
    if (changed) this.save();
  }

  createInvite(inviterKey: string, ttlMs: number): InviteRecord {
    const now = Date.now();
    const inviteId = cryptoRandomId();
    const rec: InviteRecord = {
      inviteId,
      inviterKey,
      createdAt: now,
      expiresAt: now + ttlMs,
    };
    this.db.invites[inviteId] = rec;
    this.save();
    return rec;
  }

  getInvite(inviteId: string): InviteRecord | null {
    return this.db.invites[inviteId] ?? null;
  }

  joinInvite(inviteId: string, userKey: string): {
    rec: InviteRecord | null;
    role?: 'inviter' | 'invitee';
    partnerKey?: string;
    status?: 'pending' | 'paired' | 'expired';
    error?: 'used';
  } {
    const now = Date.now();
    const rec = this.db.invites[inviteId];
    if (!rec) return { rec: null };

    if (rec.revoked) {
      delete this.db.invites[inviteId];
      this.save();
      return { rec: null, status: 'expired' };
    }

    if (rec.expiresAt <= now) {
      delete this.db.invites[inviteId];
      this.save();
      return { rec: null, status: 'expired' };
    }

    // inviter
    if (userKey === rec.inviterKey) {
      const status = rec.inviteeKey ? 'paired' : 'pending';
      return { rec, role: 'inviter', partnerKey: rec.inviteeKey, status };
    }

    // invitee first-come
    if (!rec.inviteeKey) {
      rec.inviteeKey = userKey;
      this.db.invites[inviteId] = rec;
      this.save();
      return { rec, role: 'invitee', partnerKey: rec.inviterKey, status: 'paired' };
    }

    // already paired
    if (userKey === rec.inviteeKey) {
      return { rec, role: 'invitee', partnerKey: rec.inviterKey, status: 'paired' };
    }

    // outsider hard block
    return { rec, status: 'paired', error: 'used' };
  }

  reissueInvite(inviteId: string, userKey: string, ttlMs: number):
    | { ok: false; reason: 'not_found' | 'expired' | 'forbidden' }
    | { ok: true; inviteId: string; expiresAt: number } {
    const now = Date.now();
    const rec = this.db.invites[inviteId];
    if (!rec) return { ok: false, reason: 'not_found' };

    if (rec.revoked || rec.expiresAt <= now) {
      delete this.db.invites[inviteId];
      this.save();
      return { ok: false, reason: 'expired' };
    }

    if (userKey !== rec.inviterKey) {
      return { ok: false, reason: 'forbidden' };
    }

    // revoke old invite immediately
    rec.revoked = true;
    this.db.invites[inviteId] = rec;
    this.save();

    const next = this.createInvite(rec.inviterKey, ttlMs);
    return { ok: true, inviteId: next.inviteId, expiresAt: next.expiresAt };
  }
}

import crypto from 'node:crypto';

function cryptoRandomId(): string {
  return crypto.randomBytes(12).toString('hex');
}
