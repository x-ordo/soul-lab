/**
 * Admin Routes - 관리자 대시보드 API
 * Security: JWT authentication with rate limiting
 */
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { timingSafeEqual } from 'crypto';
import { getConfig } from '../config/index.js';
import type { IInviteStore, IRewardStore } from '../stores/interface.js';
import {
  generateAdminToken,
  verifyAdminToken,
  checkLoginRateLimit,
  resetLoginAttempts,
  cleanupLoginAttempts,
} from '../lib/auth.js';
import { logger } from '../lib/logger.js';

interface AdminRoutesOptions {
  dataDir: string;
  store: IInviteStore;
  rewards: IRewardStore;
}

// Helper: 날짜 키 생성 (YYYY-MM-DD)
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Helper: N일 전 날짜 키 목록 생성
function getDateKeys(days: number): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    keys.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    );
  }
  return keys;
}

// Helper: JSON 파일 읽기
function readJsonFile<T>(filePath: string, defaultValue: T): T {
  if (!existsSync(filePath)) return defaultValue;
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return defaultValue;
  }
}

export const adminRoutes: FastifyPluginAsync<AdminRoutesOptions> = async (app, opts) => {
  const { dataDir, store, rewards } = opts;

  // Cleanup old rate limit records periodically
  const cleanupInterval = setInterval(() => cleanupLoginAttempts(), 60 * 1000);
  app.addHook('onClose', () => clearInterval(cleanupInterval));

  // Auth middleware for admin routes (JWT verification)
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for login endpoint
    if (request.url === '/api/admin/login') return;

    const config = getConfig();
    if (!config.ADMIN_PASSWORD || !config.JWT_SECRET) {
      return reply.code(503).send({ error: 'admin_not_configured' });
    }

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'unauthorized', message: 'Bearer token required' });
    }

    const token = authHeader.slice(7);
    const payload = verifyAdminToken(token);

    if (!payload) {
      logger.warn({ ip: request.ip }, 'admin_invalid_token');
      return reply.code(401).send({ error: 'invalid_token', message: 'Token expired or invalid' });
    }

    // Token is valid, proceed
  });

  // POST /api/admin/login - 로그인 (with rate limiting)
  app.post('/api/admin/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const config = getConfig();
    if (!config.ADMIN_PASSWORD || !config.JWT_SECRET) {
      return reply.code(503).send({ error: 'admin_not_configured' });
    }

    const ip = request.ip;

    // Rate limit check
    const rateLimit = checkLoginRateLimit(ip);
    if (!rateLimit.allowed) {
      logger.warn({ ip }, 'admin_login_rate_limited');
      reply.header('Retry-After', String(rateLimit.retryAfter));
      return reply.code(429).send({
        error: 'too_many_attempts',
        message: `Too many login attempts. Try again in ${rateLimit.retryAfter} seconds.`,
        retryAfter: rateLimit.retryAfter,
      });
    }

    const body = request.body as { password?: string };
    if (!body?.password) {
      return reply.code(400).send({ error: 'password_required' });
    }

    // Constant-time comparison to prevent timing attacks
    const inputBuffer = Buffer.from(body.password);
    const expectedBuffer = Buffer.from(config.ADMIN_PASSWORD || '');
    const passwordMatch =
      inputBuffer.length === expectedBuffer.length &&
      timingSafeEqual(inputBuffer, expectedBuffer);

    if (!passwordMatch) {
      logger.warn({ ip }, 'admin_login_failed');
      return reply.code(401).send({ error: 'invalid_password' });
    }

    // Success - reset rate limit and generate JWT
    resetLoginAttempts(ip);
    const token = generateAdminToken();

    logger.info({ ip }, 'admin_login_success');
    return {
      success: true,
      token,
      expiresIn: '24h',
    };
  });

  // GET /api/admin/metrics/overview - 전체 요약
  app.get('/api/admin/metrics/overview', async () => {
    const today = todayKey();

    // Load data files
    const balancesPath = join(dataDir, 'credit_balances.json');
    const purchasesPath = join(dataDir, 'credit_purchases.json');
    const invitesPath = join(dataDir, 'invites.json');
    const rewardsPath = join(dataDir, 'rewards.json');

    const balances = readJsonFile<Record<string, unknown>>(balancesPath, {});
    const purchases = readJsonFile<Record<string, { status: string; amount: number; completedAt?: string }>>(
      purchasesPath,
      {}
    );
    const invites = readJsonFile<{ invites: Record<string, { inviteeKey?: string; revoked?: boolean }> }>(
      invitesPath,
      { invites: {} }
    );
    const rewardsData = readJsonFile<{ rewards: Record<string, { dateKey: string; userKey: string }> }>(
      rewardsPath,
      { rewards: {} }
    );

    // Total users
    const totalUsers = Object.keys(balances).length;

    // DAU today
    const dauTodaySet = new Set<string>();
    for (const rec of Object.values(rewardsData.rewards)) {
      if (rec.dateKey === today) {
        dauTodaySet.add(rec.userKey);
      }
    }
    const dauToday = dauTodaySet.size;

    // Revenue
    let totalRevenue = 0;
    let revenueToday = 0;
    for (const p of Object.values(purchases)) {
      if (p.status === 'completed') {
        totalRevenue += p.amount;
        if (p.completedAt?.startsWith(today)) {
          revenueToday += p.amount;
        }
      }
    }

    // Viral metrics
    let totalInvites = 0;
    let pairedInvites = 0;
    for (const inv of Object.values(invites.invites)) {
      if (inv.revoked) continue;
      totalInvites++;
      if (inv.inviteeKey) pairedInvites++;
    }
    const viralConversionRate = totalInvites > 0 ? pairedInvites / totalInvites : 0;

    return {
      dauToday,
      revenueToday,
      totalUsers,
      totalRevenue,
      totalInvites,
      pairedInvites,
      viralConversionRate: Math.round(viralConversionRate * 1000) / 10, // percentage with 1 decimal
    };
  });

  // GET /api/admin/metrics/dau - 일별 활성 사용자 (30일)
  app.get('/api/admin/metrics/dau', async () => {
    const rewardsPath = join(dataDir, 'rewards.json');
    const rewardsData = readJsonFile<{ rewards: Record<string, { dateKey: string; userKey: string }> }>(
      rewardsPath,
      { rewards: {} }
    );

    const dateKeys = getDateKeys(30);
    const dauByDate = new Map<string, Set<string>>();

    // Initialize all dates
    for (const dk of dateKeys) {
      dauByDate.set(dk, new Set());
    }

    // Count unique users per day
    for (const rec of Object.values(rewardsData.rewards)) {
      const set = dauByDate.get(rec.dateKey);
      if (set) {
        set.add(rec.userKey);
      }
    }

    // Convert to array
    const result = dateKeys
      .map((date) => ({
        date,
        count: dauByDate.get(date)?.size || 0,
      }))
      .reverse(); // oldest first

    return { data: result };
  });

  // GET /api/admin/metrics/revenue - 매출 데이터 (30일)
  app.get('/api/admin/metrics/revenue', async () => {
    const purchasesPath = join(dataDir, 'credit_purchases.json');
    const purchases = readJsonFile<
      Record<string, { status: string; amount: number; completedAt?: string; sku: string }>
    >(purchasesPath, {});

    const dateKeys = getDateKeys(30);
    const revenueByDate = new Map<string, number>();
    const revenueBySku = new Map<string, number>();

    // Initialize all dates
    for (const dk of dateKeys) {
      revenueByDate.set(dk, 0);
    }

    // Sum revenue
    for (const p of Object.values(purchases)) {
      if (p.status !== 'completed') continue;

      const dateKey = p.completedAt?.slice(0, 10) || '';
      const current = revenueByDate.get(dateKey);
      if (current !== undefined) {
        revenueByDate.set(dateKey, current + p.amount);
      }

      // By SKU
      revenueBySku.set(p.sku, (revenueBySku.get(p.sku) || 0) + p.amount);
    }

    const byDate = dateKeys
      .map((date) => ({
        date,
        amount: revenueByDate.get(date) || 0,
      }))
      .reverse();

    const bySku = Array.from(revenueBySku.entries())
      .map(([sku, amount]) => ({ sku, amount }))
      .sort((a, b) => b.amount - a.amount);

    return { byDate, bySku };
  });

  // GET /api/admin/metrics/viral - 바이럴 전환율
  app.get('/api/admin/metrics/viral', async () => {
    const invitesPath = join(dataDir, 'invites.json');
    const invites = readJsonFile<{
      invites: Record<string, { inviteeKey?: string; revoked?: boolean; createdAt: number; expiresAt: number }>;
    }>(invitesPath, { invites: {} });

    const now = Date.now();
    let created = 0;
    let paired = 0;
    let pending = 0;
    let expired = 0;

    for (const inv of Object.values(invites.invites)) {
      if (inv.revoked) continue;
      created++;

      if (inv.inviteeKey) {
        paired++;
      } else if (inv.expiresAt > now) {
        pending++;
      } else {
        expired++;
      }
    }

    return {
      created,
      paired,
      pending,
      expired,
      conversionRate: created > 0 ? Math.round((paired / created) * 1000) / 10 : 0,
    };
  });

  // GET /api/admin/metrics/retention - 스트릭 분포
  app.get('/api/admin/metrics/retention', async () => {
    const streakPath = join(dataDir, 'credit_streak_rewards.json');
    const streakData = readJsonFile<Record<string, { userKey: string; streak: number }>>(streakPath, {});

    // Get max streak per user
    const userMaxStreak = new Map<string, number>();
    for (const rec of Object.values(streakData)) {
      const current = userMaxStreak.get(rec.userKey) || 0;
      userMaxStreak.set(rec.userKey, Math.max(current, rec.streak));
    }

    // Build distribution
    const distribution: Record<string, number> = {};
    let totalStreak = 0;

    for (const streak of userMaxStreak.values()) {
      const bucket = streak >= 30 ? '30+' : streak >= 14 ? '14-29' : streak >= 7 ? '7-13' : streak >= 3 ? '3-6' : '1-2';
      distribution[bucket] = (distribution[bucket] || 0) + 1;
      totalStreak += streak;
    }

    return {
      distribution,
      avgStreak: userMaxStreak.size > 0 ? Math.round((totalStreak / userMaxStreak.size) * 10) / 10 : 0,
      activeUsers: userMaxStreak.size,
    };
  });

  // GET /api/admin/users - 사용자 목록
  app.get('/api/admin/users', async (request) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50', 10), 100);
    const offset = parseInt(query.offset || '0', 10);

    const balancesPath = join(dataDir, 'credit_balances.json');
    const balances = readJsonFile<
      Record<string, { userKey: string; credits: number; totalPurchased: number; totalUsed: number; lastUpdated: string }>
    >(balancesPath, {});

    const users = Object.values(balances)
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(offset, offset + limit);

    return {
      users,
      total: Object.keys(balances).length,
      limit,
      offset,
    };
  });

  // GET /api/admin/transactions - 최근 거래
  app.get('/api/admin/transactions', async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit || '20', 10), 100);

    const transactionsPath = join(dataDir, 'credit_transactions.json');
    const transactions = readJsonFile<
      Array<{
        id: string;
        userKey: string;
        type: string;
        amount: number;
        balance: number;
        description: string;
        timestamp: string;
      }>
    >(transactionsPath, []);

    const recent = transactions.slice(-limit).reverse();

    return { transactions: recent };
  });
};
