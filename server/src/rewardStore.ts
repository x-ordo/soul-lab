import fs from 'node:fs';
import path from 'node:path';

type RewardRecord = {
  key: string; // userKey:dateKey
  userKey: string;
  dateKey: string;
  scope?: string;
  earnedAt: number;
  ip?: string;
  ua?: string;
};

type DB = { rewards: Record<string, RewardRecord> };

function ensureDir(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

export class RewardStore {
  private filePath: string;
  private db: DB;

  constructor(dataDir: string) {
    ensureDir(dataDir);
    this.filePath = path.join(dataDir, 'rewards.json');
    this.db = this.load();
  }

  private load(): DB {
    try {
      if (!fs.existsSync(this.filePath)) return { rewards: {} };
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as DB;
      if (!parsed.rewards) return { rewards: {} };
      return parsed;
    } catch {
      return { rewards: {} };
    }
  }

  private save() {
    fs.writeFileSync(this.filePath, JSON.stringify(this.db, null, 2), 'utf-8');
  }

  cleanupOlderThan(days: number, now = Date.now()) {
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    let changed = false;
    for (const [k, r] of Object.entries(this.db.rewards)) {
      if (r.earnedAt < cutoff) {
        delete this.db.rewards[k];
        changed = true;
      }
    }
    if (changed) this.save();
  }

  earn(userKey: string, dateKey: string, scope?: string, meta?: { ip?: string; ua?: string }) {
    const key = `${userKey}:${dateKey}`;
    const existing = this.db.rewards[key];
    if (existing) return { already: true, record: existing };

    const rec: RewardRecord = {
      key,
      userKey,
      dateKey,
      scope,
      earnedAt: Date.now(),
      ip: meta?.ip,
      ua: meta?.ua,
    };
    this.db.rewards[key] = rec;
    this.save();
    return { already: false, record: rec };
  }
}
