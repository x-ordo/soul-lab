/**
 * Demo Data Seeding Script
 * 투자자 시연용 샘플 데이터 생성
 *
 * Usage: npx tsx server/scripts/seed-demo-data.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = process.env.DATA_DIR || 'server/data';

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Helper: Generate random user key
function randomUserKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'sl_';
  for (let i = 0; i < 20; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

// Helper: Random date in past N days
function randomDate(daysAgo: number): Date {
  const now = new Date();
  const past = new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
  return past;
}

// Helper: Date key format
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Generate users (150 users over 30 days)
const users: string[] = [];
for (let i = 0; i < 150; i++) {
  users.push(randomUserKey());
}

console.log(`Generated ${users.length} users`);

// 1. Credit Balances
const creditBalances: Record<string, unknown> = {};
users.forEach((userKey, i) => {
  const hasPurchased = Math.random() > 0.7; // 30% purchased
  const totalPurchased = hasPurchased ? Math.floor(Math.random() * 200) + 10 : 0;
  const totalUsed = Math.floor(totalPurchased * Math.random() * 0.8);
  const bonus = Math.floor(Math.random() * 20);

  creditBalances[userKey] = {
    userKey,
    credits: totalPurchased - totalUsed + bonus,
    totalPurchased,
    totalUsed,
    lastUpdated: randomDate(30).toISOString(),
  };
});

writeFileSync(join(DATA_DIR, 'credit_balances.json'), JSON.stringify(creditBalances, null, 2));
console.log('Created credit_balances.json');

// 2. Credit Purchases (45 purchases from 30% of users)
const purchases: Record<string, unknown> = {};
const skus = ['credit_10', 'credit_50', 'credit_150', 'credit_500'];
const prices = { credit_10: 1000, credit_50: 4500, credit_150: 12000, credit_500: 35000 };
const credits = { credit_10: 10, credit_50: 55, credit_150: 170, credit_500: 600 };

let purchaseCount = 0;
users.forEach((userKey) => {
  if (Math.random() > 0.7) {
    // 30% make purchases
    const numPurchases = Math.floor(Math.random() * 3) + 1;
    for (let p = 0; p < numPurchases; p++) {
      const sku = skus[Math.floor(Math.random() * skus.length)];
      const orderId = `order_${Date.now()}_${purchaseCount++}`;
      const createdAt = randomDate(30);

      purchases[orderId] = {
        orderId,
        userKey,
        sku,
        credits: credits[sku as keyof typeof credits],
        amount: prices[sku as keyof typeof prices],
        status: 'completed',
        createdAt: createdAt.toISOString(),
        completedAt: new Date(createdAt.getTime() + 60000).toISOString(),
      };
    }
  }
});

writeFileSync(join(DATA_DIR, 'credit_purchases.json'), JSON.stringify(purchases, null, 2));
console.log(`Created credit_purchases.json (${Object.keys(purchases).length} purchases)`);

// 3. Credit Transactions
const transactions: unknown[] = [];
let txId = 1;

Object.values(purchases).forEach((p: any) => {
  transactions.push({
    id: `tx_${txId++}`,
    userKey: p.userKey,
    type: 'purchase',
    amount: p.credits,
    balance: p.credits,
    description: `${p.sku} 구매`,
    orderId: p.orderId,
    sku: p.sku,
    timestamp: p.completedAt,
  });

  // Some usage transactions
  if (Math.random() > 0.5) {
    const usedAmount = Math.floor(Math.random() * 5) + 1;
    transactions.push({
      id: `tx_${txId++}`,
      userKey: p.userKey,
      type: 'use',
      amount: -usedAmount,
      balance: p.credits - usedAmount,
      description: 'AI 상담',
      timestamp: new Date(new Date(p.completedAt).getTime() + 3600000).toISOString(),
    });
  }
});

writeFileSync(join(DATA_DIR, 'credit_transactions.json'), JSON.stringify(transactions, null, 2));
console.log(`Created credit_transactions.json (${transactions.length} transactions)`);

// 4. Rewards (daily active users)
const rewards: { rewards: Record<string, unknown> } = { rewards: {} };

// Distribute activity over 30 days with growth trend
for (let day = 29; day >= 0; day--) {
  const d = new Date();
  d.setDate(d.getDate() - day);
  const dk = dateKey(d);

  // More users in recent days (growth simulation)
  const activeRatio = 0.1 + (30 - day) * 0.02; // 10% to 70%
  const activeCount = Math.floor(users.length * Math.min(activeRatio, 0.7));

  const shuffled = [...users].sort(() => Math.random() - 0.5);
  shuffled.slice(0, activeCount).forEach((userKey) => {
    const key = `${userKey}:${dk}`;
    rewards.rewards[key] = {
      key,
      userKey,
      dateKey: dk,
      earnedAt: d.getTime(),
    };
  });
}

writeFileSync(join(DATA_DIR, 'rewards.json'), JSON.stringify(rewards, null, 2));
console.log(`Created rewards.json (${Object.keys(rewards.rewards).length} records)`);

// 5. Invites (viral mechanics)
const invites: { invites: Record<string, unknown> } = { invites: {} };

users.forEach((userKey, i) => {
  if (Math.random() > 0.6) {
    // 40% create invites
    const inviteId = `inv_${i}_${Date.now()}`;
    const createdAt = randomDate(14);
    const paired = Math.random() > 0.5; // 50% paired

    invites.invites[inviteId] = {
      inviteId,
      inviterKey: userKey,
      inviteeKey: paired ? users[(i + 50) % users.length] : undefined,
      createdAt: createdAt.getTime(),
      expiresAt: createdAt.getTime() + 24 * 60 * 60 * 1000,
      revoked: false,
    };
  }
});

writeFileSync(join(DATA_DIR, 'invites.json'), JSON.stringify(invites, null, 2));
console.log(`Created invites.json (${Object.keys(invites.invites).length} invites)`);

// 6. Streak Rewards
const streakRewards: Record<string, unknown> = {};

users.slice(0, 80).forEach((userKey, i) => {
  // Top 80 users have streaks
  const streak = Math.floor(Math.random() * 21) + 3; // 3-24 day streaks
  const id = `streak_${userKey}_${dateKey(new Date())}`;

  streakRewards[id] = {
    id,
    userKey,
    dateKey: dateKey(new Date()),
    streak,
    rewardType: streak % 7 === 0 ? 'milestone' : 'daily_bonus',
    credits: streak >= 30 ? 20 : streak >= 21 ? 10 : streak >= 14 ? 5 : streak >= 7 ? 3 : 1,
    createdAt: new Date().toISOString(),
  };
});

writeFileSync(join(DATA_DIR, 'credit_streak_rewards.json'), JSON.stringify(streakRewards, null, 2));
console.log(`Created credit_streak_rewards.json (${Object.keys(streakRewards).length} streaks)`);

// 7. Credit Referrals
const referrals: Record<string, unknown> = {};

Object.values(invites.invites).forEach((inv: any, i) => {
  if (inv.inviteeKey) {
    const id = `ref_${inv.inviterKey}_${inv.inviteeKey}`;
    referrals[id] = {
      id,
      inviterKey: inv.inviterKey,
      inviteeKey: inv.inviteeKey,
      dateKey: dateKey(new Date(inv.createdAt)),
      inviterCredited: true,
      inviteeCredited: true,
      createdAt: new Date(inv.createdAt).toISOString(),
    };
  }
});

writeFileSync(join(DATA_DIR, 'credit_referrals.json'), JSON.stringify(referrals, null, 2));
console.log(`Created credit_referrals.json (${Object.keys(referrals).length} referrals)`);

// Summary
console.log('\n========================================');
console.log('Demo Data Generation Complete!');
console.log('========================================');
console.log(`Users: ${users.length}`);
console.log(`Purchases: ${Object.keys(purchases).length}`);
console.log(`Transactions: ${transactions.length}`);
console.log(`DAU Records: ${Object.keys(rewards.rewards).length}`);
console.log(`Invites: ${Object.keys(invites.invites).length}`);
console.log(`Streaks: ${Object.keys(streakRewards).length}`);
console.log(`Referrals: ${Object.keys(referrals).length}`);

// Calculate totals
const totalRevenue = Object.values(purchases).reduce((sum: number, p: any) => sum + p.amount, 0);
console.log(`\nTotal Revenue: ${(totalRevenue / 1000).toLocaleString()}K KRW`);
