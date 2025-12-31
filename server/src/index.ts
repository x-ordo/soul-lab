import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fs from 'fs';
import path from 'path';
import { FileStore } from './store.js';
import { EventLogger } from './logger.js';
import { FixedWindowLimiter } from './limiter.js';
import { RewardStore } from './rewardStore.js';
import { fortuneRoutes } from './routes/fortune.js';
import { creditRoutes } from './routes/credits.js';
import { adminRoutes } from './routes/admin.js';
import { loadConfig } from './config/index.js';
import { logger as pinoLogger } from './lib/logger.js';
import { requestContextPlugin } from './middleware/requestContext.js';
import { errorHandlerPlugin } from './middleware/errorHandler.js';

const config = loadConfig();

const app = Fastify({
  logger: false, // Using custom pino logger instead
});

const PORT = config.PORT;
const DATA_DIR = config.DATA_DIR;

// Invite TTL: 24h
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

// Rate limit (fixed-window)
const INVITE_WINDOW_MS = 60 * 60 * 1000; // 1h
const INVITE_LIMIT_PER_IP = config.INVITE_LIMIT_PER_IP;
const INVITE_LIMIT_PER_USER = config.INVITE_LIMIT_PER_USER;

const REWARD_WINDOW_MS = 10 * 60 * 1000; // 10m (spam 방지)
const REWARD_LIMIT_PER_IP = config.REWARD_LIMIT_PER_IP;
const REWARD_LIMIT_PER_USER = config.REWARD_LIMIT_PER_USER;

const store = new FileStore(DATA_DIR);
const rewards = new RewardStore(DATA_DIR);
const logger = new EventLogger(DATA_DIR);

const limiter = new FixedWindowLimiter();

await app.register(cors, { origin: true, credentials: false });

// Register middleware plugins
await app.register(requestContextPlugin);
await app.register(errorHandlerPlugin);

// Register fortune routes (astrology, tarot, AI)
await app.register(fortuneRoutes);

// Register credit routes (IAP, credits)
await app.register(creditRoutes, { dataDir: DATA_DIR });

// Register admin routes (dashboard)
await app.register(adminRoutes, { dataDir: DATA_DIR, store, rewards });

function meta(req: any) {
  const ip = req.ip;
  const ua = String(req.headers?.['user-agent'] ?? '');
  return { ip, ua };
}

function rateKey(prefix: string, v: string) {
  return `${prefix}:${v}`;
}

app.get('/health', async () => ({ ok: true }));

app.get('/ready', async (req, reply) => {
  const checks: Record<string, boolean> = {
    dataDir: false,
    aiProvider: false,
  };

  // Check data directory is writable
  try {
    const testFile = path.join(DATA_DIR, '.ready-check');
    fs.writeFileSync(testFile, 'ok');
    fs.unlinkSync(testFile);
    checks.dataDir = true;
  } catch {
    checks.dataDir = false;
  }

  // Check if at least one AI provider is configured
  checks.aiProvider = !!(config.OPENAI_API_KEY || config.ANTHROPIC_API_KEY);

  const ready = checks.dataDir; // AI provider is optional

  if (!ready) {
    pinoLogger.warn({ checks }, 'readiness_check_failed');
    return reply.code(503).send({ ok: false, checks });
  }

  return { ok: true, checks };
});

app.post('/api/invites', async (req, reply) => {
  store.cleanup();
  limiter.sweep(INVITE_WINDOW_MS);

  const body = (req.body ?? {}) as any;
  const inviterKey = String(body.inviterKey ?? '').trim();
  if (!inviterKey) return reply.code(400).send({ error: 'inviterKey_required' });

  const { ip, ua } = meta(req);

  const ipRate = limiter.allow(rateKey('invite_ip', ip), INVITE_LIMIT_PER_IP, INVITE_WINDOW_MS);
  if (!ipRate.ok) {
    logger.log({ ts: Date.now(), type: 'invite_create_rate_limited', ip, ua, inviterKey, resetAt: ipRate.resetAt });
    return reply.code(429).send({ error: 'rate_limited', resetAt: ipRate.resetAt });
  }

  const userRate = limiter.allow(rateKey('invite_user', inviterKey), INVITE_LIMIT_PER_USER, INVITE_WINDOW_MS);
  if (!userRate.ok) {
    logger.log({ ts: Date.now(), type: 'invite_create_rate_limited', ip, ua, inviterKey, resetAt: userRate.resetAt });
    return reply.code(429).send({ error: 'rate_limited', resetAt: userRate.resetAt });
  }

  const rec = store.createInvite(inviterKey, INVITE_TTL_MS);

  logger.log({
    ts: Date.now(),
    type: 'invite_created',
    ip,
    ua,
    inviterKey,
    inviteId: rec.inviteId,
    expiresAt: rec.expiresAt,
  });

  return { inviteId: rec.inviteId, expiresAt: rec.expiresAt };
});

app.get('/api/invites/:id', async (req, reply) => {
  store.cleanup();
  const id = (req.params as any).id as string;
  const rec = store.getInvite(id);
  if (!rec) return reply.code(404).send({ error: 'not_found' });

  const now = Date.now();
  const status = rec.expiresAt <= now ? 'expired' : rec.inviteeKey ? 'paired' : 'pending';
  return { inviteId: rec.inviteId, status, expiresAt: rec.expiresAt };
});

app.post('/api/invites/:id/join', async (req, reply) => {
  store.cleanup();
  const id = (req.params as any).id as string;
  const body = (req.body ?? {}) as any;
  const userKey = String(body.userKey ?? '').trim();
  if (!userKey) return reply.code(400).send({ error: 'userKey_required' });

  const { ip, ua } = meta(req);

  const out = store.joinInvite(id, userKey);

  if (!out.rec) {
    logger.log({ ts: Date.now(), type: 'invite_join_not_found', ip, ua, inviteId: id, userKey, status: out.status });
    return reply.code(404).send({ error: out.status === 'expired' ? 'expired' : 'not_found' });
  }

  if (out.error === 'used') {
    logger.log({
      ts: Date.now(),
      type: 'invite_join_used_blocked',
      ip,
      ua,
      inviteId: id,
      userKey,
      inviterKey: out.rec.inviterKey,
      inviteeKey: out.rec.inviteeKey,
    });
    return reply.code(403).send({ error: 'used' });
  }

  logger.log({
    ts: Date.now(),
    type: 'invite_joined',
    ip,
    ua,
    inviteId: id,
    userKey,
    role: out.role,
    status: out.status,
    partnerKey: out.partnerKey ?? null,
  });

  return {
    inviteId: id,
    status: out.status,
    role: out.role,
    partnerKey: out.partnerKey ?? null,
    expiresAt: out.rec.expiresAt,
  };
});

app.post('/api/invites/:id/reissue', async (req, reply) => {
  store.cleanup();
  const id = (req.params as any).id as string;
  const body = (req.body ?? {}) as any;
  const userKey = String(body.userKey ?? '').trim();
  if (!userKey) return reply.code(400).send({ error: 'userKey_required' });

  const { ip, ua } = meta(req);

  const out = store.reissueInvite(id, userKey, INVITE_TTL_MS);
  if (!out.ok) {
    logger.log({ ts: Date.now(), type: 'invite_reissue_failed', ip, ua, inviteId: id, userKey, reason: out.reason });
    if (out.reason === 'forbidden') return reply.code(403).send({ error: 'forbidden' });
    if (out.reason === 'expired') return reply.code(404).send({ error: 'expired' });
    return reply.code(404).send({ error: 'not_found' });
  }

  logger.log({
    ts: Date.now(),
    type: 'invite_reissued',
    ip,
    ua,
    oldInviteId: id,
    inviterKey: userKey,
    newInviteId: out.inviteId,
    expiresAt: out.expiresAt,
  });

  return out;
});

// 보상형 광고 "1일 1회" 서버 기록 (완벽한 검증은 불가하지만, 다중 기기/리플레이 방어에 도움)
app.post('/api/rewards/earn', async (req, reply) => {
  limiter.sweep(REWARD_WINDOW_MS);

  const body = (req.body ?? {}) as any;
  const userKey = String(body.userKey ?? '').trim();
  const dateKey = String(body.dateKey ?? '').trim(); // e.g. 2025-12-26
  const scope = typeof body.scope === 'string' ? body.scope : undefined;

  if (!userKey) return reply.code(400).send({ error: 'userKey_required' });
  if (!dateKey) return reply.code(400).send({ error: 'dateKey_required' });

  const { ip, ua } = meta(req);

  const ipRate = limiter.allow(rateKey('reward_ip', ip), REWARD_LIMIT_PER_IP, REWARD_WINDOW_MS);
  const userRate = limiter.allow(rateKey('reward_user', userKey), REWARD_LIMIT_PER_USER, REWARD_WINDOW_MS);
  if (!ipRate.ok || !userRate.ok) {
    logger.log({ ts: Date.now(), type: 'reward_rate_limited', ip, ua, userKey, dateKey, scope });
    return reply.code(429).send({ error: 'rate_limited' });
  }

  rewards.cleanupOlderThan(45); // 45일 유지
  const out = rewards.earn(userKey, dateKey, scope, { ip, ua });

  logger.log({
    ts: Date.now(),
    type: 'reward_earned',
    ip,
    ua,
    userKey,
    dateKey,
    scope,
    already: out.already,
  });

  return { ok: true, already: out.already };
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  pinoLogger.info({ port: PORT, dataDir: DATA_DIR, env: config.NODE_ENV }, 'server_started');
}).catch((err) => {
  pinoLogger.fatal({ err }, 'server_startup_failed');
  process.exit(1);
});
