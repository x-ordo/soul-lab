/**
 * Referral Leaderboard Routes
 *
 * Tracks and displays top referrers to gamify viral sharing.
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { loadConfig } from '../config/index.js';
import { logger } from '../lib/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const config = loadConfig();

// ============================================
// Types
// ============================================

interface ReferralStats {
  userKey: string;
  displayName: string; // Anonymized: "별★123"
  totalReferrals: number;
  weeklyReferrals: number;
  lastReferralAt: number;
  createdAt: number;
}

interface LeaderboardEntry {
  rank: number;
  displayName: string;
  referrals: number;
  isCurrentUser: boolean;
}

// ============================================
// Storage
// ============================================

const LEADERBOARD_FILE = path.join(config.DATA_DIR, 'leaderboard.json');

function loadLeaderboard(): Map<string, ReferralStats> {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    logger.error({ error: e }, 'Failed to load leaderboard');
  }
  return new Map();
}

function saveLeaderboard(data: Map<string, ReferralStats>): void {
  try {
    const dir = path.dirname(LEADERBOARD_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(Object.fromEntries(data), null, 2));
  } catch (e) {
    logger.error({ error: e }, 'Failed to save leaderboard');
  }
}

const leaderboard = loadLeaderboard();

// ============================================
// Helpers
// ============================================

function generateDisplayName(userKey: string): string {
  // Create anonymized display name: 별★XXX
  const hash = userKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const suffix = (hash % 900 + 100).toString();
  const emojis = ['⭐', '🌟', '✨', '💫', '🌙', '☀️', '🔮', '💎'];
  const emoji = emojis[hash % emojis.length];
  return `${emoji}${suffix}`;
}

function getWeekStart(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
  const weekStart = new Date(now.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.getTime();
}

// ============================================
// Routes
// ============================================

interface RecordReferralBody {
  inviterKey: string;
  inviteeKey: string;
}

export async function leaderboardRoutes(app: FastifyInstance) {
  // Record a referral
  app.post('/api/leaderboard/record', async (req: FastifyRequest, reply: FastifyReply) => {
    const { inviterKey, inviteeKey } = req.body as RecordReferralBody;

    if (!inviterKey || !inviteeKey) {
      return reply.status(400).send({ error: 'Missing inviterKey or inviteeKey' });
    }

    // Prevent self-referral
    if (inviterKey === inviteeKey) {
      return reply.status(400).send({ error: 'Self-referral not allowed' });
    }

    const now = Date.now();
    const weekStart = getWeekStart();

    let stats = leaderboard.get(inviterKey);

    if (!stats) {
      stats = {
        userKey: inviterKey,
        displayName: generateDisplayName(inviterKey),
        totalReferrals: 0,
        weeklyReferrals: 0,
        lastReferralAt: 0,
        createdAt: now,
      };
    }

    // Reset weekly if new week
    if (stats.lastReferralAt < weekStart) {
      stats.weeklyReferrals = 0;
    }

    stats.totalReferrals++;
    stats.weeklyReferrals++;
    stats.lastReferralAt = now;

    leaderboard.set(inviterKey, stats);
    saveLeaderboard(leaderboard);

    logger.info({ inviterKey, totalReferrals: stats.totalReferrals }, 'Referral recorded');

    return {
      success: true,
      totalReferrals: stats.totalReferrals,
      weeklyReferrals: stats.weeklyReferrals,
    };
  });

  // Get weekly leaderboard
  app.get('/api/leaderboard/weekly', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userKey } = req.query as { userKey?: string };
    const weekStart = getWeekStart();

    // Filter and sort by weekly referrals
    const entries = Array.from(leaderboard.values())
      .filter((s) => s.lastReferralAt >= weekStart && s.weeklyReferrals > 0)
      .sort((a, b) => b.weeklyReferrals - a.weeklyReferrals)
      .slice(0, 50);

    // Format response
    const result: LeaderboardEntry[] = entries.map((s, idx) => ({
      rank: idx + 1,
      displayName: s.displayName,
      referrals: s.weeklyReferrals,
      isCurrentUser: s.userKey === userKey,
    }));

    // Include current user's rank if not in top 50
    let userRank: LeaderboardEntry | null = null;
    if (userKey) {
      const userStats = leaderboard.get(userKey);
      if (userStats && userStats.weeklyReferrals > 0) {
        const allSorted = Array.from(leaderboard.values())
          .filter((s) => s.lastReferralAt >= weekStart && s.weeklyReferrals > 0)
          .sort((a, b) => b.weeklyReferrals - a.weeklyReferrals);

        const userIdx = allSorted.findIndex((s) => s.userKey === userKey);
        if (userIdx >= 50) {
          userRank = {
            rank: userIdx + 1,
            displayName: userStats.displayName,
            referrals: userStats.weeklyReferrals,
            isCurrentUser: true,
          };
        }
      }
    }

    return {
      leaderboard: result,
      userRank,
      weekStart: new Date(weekStart).toISOString(),
    };
  });

  // Get all-time leaderboard
  app.get('/api/leaderboard/alltime', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userKey } = req.query as { userKey?: string };

    const entries = Array.from(leaderboard.values())
      .filter((s) => s.totalReferrals > 0)
      .sort((a, b) => b.totalReferrals - a.totalReferrals)
      .slice(0, 50);

    const result: LeaderboardEntry[] = entries.map((s, idx) => ({
      rank: idx + 1,
      displayName: s.displayName,
      referrals: s.totalReferrals,
      isCurrentUser: s.userKey === userKey,
    }));

    let userRank: LeaderboardEntry | null = null;
    if (userKey) {
      const userStats = leaderboard.get(userKey);
      if (userStats && userStats.totalReferrals > 0) {
        const allSorted = Array.from(leaderboard.values())
          .filter((s) => s.totalReferrals > 0)
          .sort((a, b) => b.totalReferrals - a.totalReferrals);

        const userIdx = allSorted.findIndex((s) => s.userKey === userKey);
        if (userIdx >= 50) {
          userRank = {
            rank: userIdx + 1,
            displayName: userStats.displayName,
            referrals: userStats.totalReferrals,
            isCurrentUser: true,
          };
        }
      }
    }

    return {
      leaderboard: result,
      userRank,
    };
  });

  // Get user stats
  app.get('/api/leaderboard/me', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userKey } = req.query as { userKey?: string };

    if (!userKey) {
      return reply.status(400).send({ error: 'Missing userKey' });
    }

    const stats = leaderboard.get(userKey);

    if (!stats) {
      return {
        totalReferrals: 0,
        weeklyReferrals: 0,
        weeklyRank: null,
        allTimeRank: null,
      };
    }

    // Calculate ranks
    const weekStart = getWeekStart();
    const weeklySorted = Array.from(leaderboard.values())
      .filter((s) => s.lastReferralAt >= weekStart && s.weeklyReferrals > 0)
      .sort((a, b) => b.weeklyReferrals - a.weeklyReferrals);
    const weeklyRank = weeklySorted.findIndex((s) => s.userKey === userKey) + 1 || null;

    const allTimeSorted = Array.from(leaderboard.values())
      .filter((s) => s.totalReferrals > 0)
      .sort((a, b) => b.totalReferrals - a.totalReferrals);
    const allTimeRank = allTimeSorted.findIndex((s) => s.userKey === userKey) + 1 || null;

    return {
      displayName: stats.displayName,
      totalReferrals: stats.totalReferrals,
      weeklyReferrals: stats.weeklyReferrals,
      weeklyRank,
      allTimeRank,
    };
  });
}
