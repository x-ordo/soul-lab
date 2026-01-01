/**
 * Push Notification Routes
 *
 * Handles:
 * - Subscription storage
 * - D+1 reminder scheduling
 * - Notification sending
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import webpush from 'web-push';
import { loadConfig } from '../config/index.js';
import { logger } from '../lib/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const config = loadConfig();

// Initialize web-push if VAPID keys are configured
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@soul-lab.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ============================================
// Subscription Storage
// ============================================

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UserSubscription {
  userKey: string;
  subscription: PushSubscription;
  createdAt: number;
  lastNotified?: number;
}

const SUBSCRIPTIONS_FILE = path.join(config.DATA_DIR, 'push_subscriptions.json');

function loadSubscriptions(): Map<string, UserSubscription> {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch (e) {
    logger.error({ error: e }, 'Failed to load push subscriptions');
  }
  return new Map();
}

function saveSubscriptions(subs: Map<string, UserSubscription>): void {
  try {
    const dir = path.dirname(SUBSCRIPTIONS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(Object.fromEntries(subs), null, 2));
  } catch (e) {
    logger.error({ error: e }, 'Failed to save push subscriptions');
  }
}

const subscriptions = loadSubscriptions();

// ============================================
// Notification Types
// ============================================

interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
  actions?: { action: string; title: string }[];
}

const D1_REMINDER: NotificationPayload = {
  type: 'd1_reminder',
  title: '오늘의 운명이 도착했어요 ✨',
  body: '어제와는 다른 별의 메시지가 기다리고 있습니다.',
  icon: '/icon-192.png',
  badge: '/badge-72.png',
  data: { url: '/' },
  actions: [
    { action: 'open', title: '운세 확인하기' },
    { action: 'dismiss', title: '나중에' },
  ],
};

// ============================================
// Routes
// ============================================

interface SubscribeBody {
  userKey: string;
  subscription: PushSubscription;
}

export async function pushRoutes(app: FastifyInstance) {
  // Subscribe to push notifications
  app.post('/api/push/subscribe', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as SubscribeBody;

    if (!body.userKey || !body.subscription) {
      return reply.status(400).send({ error: 'Missing userKey or subscription' });
    }

    const userSub: UserSubscription = {
      userKey: body.userKey,
      subscription: body.subscription,
      createdAt: Date.now(),
    };

    subscriptions.set(body.userKey, userSub);
    saveSubscriptions(subscriptions);

    logger.info({ userKey: body.userKey }, 'Push subscription saved');

    return { success: true };
  });

  // Unsubscribe
  app.post('/api/push/unsubscribe', async (req: FastifyRequest, reply: FastifyReply) => {
    const { userKey } = req.body as { userKey: string };

    if (!userKey) {
      return reply.status(400).send({ error: 'Missing userKey' });
    }

    subscriptions.delete(userKey);
    saveSubscriptions(subscriptions);

    logger.info({ userKey }, 'Push subscription removed');

    return { success: true };
  });

  // Send D+1 reminder (called by cron)
  app.post('/api/push/send-d1-reminders', async (req: FastifyRequest, reply: FastifyReply) => {
    // Simple auth check
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${config.ADMIN_PASSWORD}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return reply.status(500).send({ error: 'VAPID keys not configured' });
    }

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    let sent = 0;
    let failed = 0;

    for (const [userKey, userSub] of subscriptions.entries()) {
      // Skip if notified in the last 20 hours
      if (userSub.lastNotified && now - userSub.lastNotified < oneDayMs * 0.8) {
        continue;
      }

      try {
        await webpush.sendNotification(
          userSub.subscription,
          JSON.stringify(D1_REMINDER)
        );

        userSub.lastNotified = now;
        sent++;
      } catch (error: unknown) {
        const err = error as { statusCode?: number };
        logger.error({ userKey, error }, 'Push notification failed');
        failed++;

        // Remove invalid subscriptions (410 Gone)
        if (err.statusCode === 410) {
          subscriptions.delete(userKey);
        }
      }
    }

    saveSubscriptions(subscriptions);

    logger.info({ sent, failed }, 'D+1 reminders sent');

    return { success: true, sent, failed };
  });

  // Get subscription stats (admin only)
  app.get('/api/push/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${config.ADMIN_PASSWORD}`) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    return {
      totalSubscriptions: subscriptions.size,
      vapidConfigured: !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
    };
  });
}
