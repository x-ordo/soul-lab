import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CreditStore,
  getProductBySku,
  getCreditCost,
  getAllProducts,
  getAllCosts,
  CREDIT_PRODUCTS,
} from './store';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('CreditStore', () => {
  let store: CreditStore;
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'soul-lab-credit-test-'));
    store = new CreditStore(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('getBalance', () => {
    it('returns zero balance for new user', () => {
      const balance = store.getBalance('user1');

      expect(balance.userKey).toBe('user1');
      expect(balance.credits).toBe(0);
      expect(balance.totalPurchased).toBe(0);
      expect(balance.totalUsed).toBe(0);
    });

    it('creates balance record for new user', () => {
      store.getBalance('user1');
      const balance = store.getBalance('user1');

      expect(balance.userKey).toBe('user1');
    });
  });

  describe('hasEnoughCredits', () => {
    it('returns false for new user with any amount', () => {
      expect(store.hasEnoughCredits('user1', 1)).toBe(false);
    });

    it('returns true when sufficient credits', () => {
      store.addCredits('user1', 10, 'bonus', 'Test bonus');
      expect(store.hasEnoughCredits('user1', 5)).toBe(true);
    });

    it('returns false when insufficient credits', () => {
      store.addCredits('user1', 5, 'bonus', 'Test bonus');
      expect(store.hasEnoughCredits('user1', 10)).toBe(false);
    });

    it('returns true for zero amount', () => {
      expect(store.hasEnoughCredits('user1', 0)).toBe(true);
    });
  });

  describe('addCredits', () => {
    it('adds credits to balance', () => {
      store.addCredits('user1', 10, 'bonus', 'Welcome bonus');
      const balance = store.getBalance('user1');

      expect(balance.credits).toBe(10);
    });

    it('tracks totalPurchased for purchase type', () => {
      store.addCredits('user1', 10, 'purchase', 'Test purchase', 'order1', 'credit_10');
      const balance = store.getBalance('user1');

      expect(balance.totalPurchased).toBe(10);
    });

    it('does not track totalPurchased for bonus type', () => {
      store.addCredits('user1', 10, 'bonus', 'Test bonus');
      const balance = store.getBalance('user1');

      expect(balance.totalPurchased).toBe(0);
    });

    it('returns transaction record', () => {
      const transaction = store.addCredits('user1', 10, 'bonus', 'Welcome bonus');

      expect(transaction.id).toBeTruthy();
      expect(transaction.userKey).toBe('user1');
      expect(transaction.type).toBe('bonus');
      expect(transaction.amount).toBe(10);
      expect(transaction.balance).toBe(10);
      expect(transaction.description).toBe('Welcome bonus');
    });

    it('accumulates multiple additions', () => {
      store.addCredits('user1', 10, 'bonus', 'Bonus 1');
      store.addCredits('user1', 20, 'purchase', 'Purchase 1');

      const balance = store.getBalance('user1');
      expect(balance.credits).toBe(30);
    });
  });

  describe('useCredits', () => {
    it('fails with insufficient credits', () => {
      const result = store.useCredits('user1', 10, 'Test use');

      expect(result.success).toBe(false);
      expect(result.error).toBe('insufficient_credits');
    });

    it('deducts credits on success', () => {
      store.addCredits('user1', 20, 'bonus', 'Test');
      const result = store.useCredits('user1', 10, 'Test use');

      expect(result.success).toBe(true);
      expect(store.getBalance('user1').credits).toBe(10);
    });

    it('tracks totalUsed', () => {
      store.addCredits('user1', 20, 'bonus', 'Test');
      store.useCredits('user1', 10, 'Test use');

      expect(store.getBalance('user1').totalUsed).toBe(10);
    });

    it('returns transaction with negative amount', () => {
      store.addCredits('user1', 20, 'bonus', 'Test');
      const result = store.useCredits('user1', 10, 'Test use');

      expect(result.transaction?.amount).toBe(-10);
      expect(result.transaction?.type).toBe('use');
    });

    it('allows using exact balance', () => {
      store.addCredits('user1', 10, 'bonus', 'Test');
      const result = store.useCredits('user1', 10, 'Use all');

      expect(result.success).toBe(true);
      expect(store.getBalance('user1').credits).toBe(0);
    });
  });

  describe('createPurchase', () => {
    it('creates pending purchase record', () => {
      const purchase = store.createPurchase('order1', 'user1', 'credit_10', 1000);

      expect(purchase.orderId).toBe('order1');
      expect(purchase.userKey).toBe('user1');
      expect(purchase.sku).toBe('credit_10');
      expect(purchase.status).toBe('pending');
      expect(purchase.credits).toBe(10); // from CREDIT_PRODUCTS
    });

    it('includes bonus credits', () => {
      const purchase = store.createPurchase('order1', 'user1', 'credit_50', 4500);

      expect(purchase.credits).toBe(55); // 50 + 5 bonus
    });

    it('handles unknown SKU', () => {
      const purchase = store.createPurchase('order1', 'user1', 'unknown_sku', 0);

      expect(purchase.credits).toBe(0);
    });
  });

  describe('completePurchase', () => {
    it('fails for non-existent purchase', () => {
      const result = store.completePurchase('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('purchase_not_found');
    });

    it('completes pending purchase and adds credits', () => {
      store.createPurchase('order1', 'user1', 'credit_10', 1000);
      const result = store.completePurchase('order1');

      expect(result.success).toBe(true);
      expect(store.getBalance('user1').credits).toBe(10);
    });

    it('prevents double completion', () => {
      store.createPurchase('order1', 'user1', 'credit_10', 1000);
      store.completePurchase('order1');

      const result = store.completePurchase('order1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('already_completed');
    });

    it('updates purchase status to completed', () => {
      store.createPurchase('order1', 'user1', 'credit_10', 1000);
      store.completePurchase('order1');

      const purchase = store.getPurchase('order1');
      expect(purchase?.status).toBe('completed');
      expect(purchase?.completedAt).toBeTruthy();
    });
  });

  describe('getPurchase', () => {
    it('returns undefined for non-existent purchase', () => {
      expect(store.getPurchase('nonexistent')).toBeUndefined();
    });

    it('returns existing purchase', () => {
      store.createPurchase('order1', 'user1', 'credit_10', 1000);
      const purchase = store.getPurchase('order1');

      expect(purchase?.orderId).toBe('order1');
    });
  });

  describe('getUserPurchases', () => {
    it('returns empty array for new user', () => {
      expect(store.getUserPurchases('user1')).toEqual([]);
    });

    it('returns user purchases sorted by date descending', () => {
      store.createPurchase('order1', 'user1', 'credit_10', 1000);
      store.createPurchase('order2', 'user1', 'credit_50', 4500);
      store.createPurchase('order3', 'user2', 'credit_10', 1000); // Different user

      const purchases = store.getUserPurchases('user1');
      expect(purchases).toHaveLength(2);
    });
  });

  describe('getPendingPurchases', () => {
    it('returns only pending purchases', () => {
      store.createPurchase('order1', 'user1', 'credit_10', 1000);
      store.createPurchase('order2', 'user1', 'credit_50', 4500);
      store.completePurchase('order1');

      const pending = store.getPendingPurchases('user1');
      expect(pending).toHaveLength(1);
      expect(pending[0].orderId).toBe('order2');
    });
  });

  describe('getTransactionHistory', () => {
    it('returns empty array for new user', () => {
      expect(store.getTransactionHistory('user1')).toEqual([]);
    });

    it('returns transactions in reverse chronological order', () => {
      store.addCredits('user1', 10, 'bonus', 'First');
      store.addCredits('user1', 20, 'bonus', 'Second');

      const history = store.getTransactionHistory('user1');
      expect(history[0].description).toBe('Second');
      expect(history[1].description).toBe('First');
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        store.addCredits('user1', 1, 'bonus', `Tx ${i}`);
      }

      const history = store.getTransactionHistory('user1', 5);
      expect(history).toHaveLength(5);
    });
  });

  describe('persistence', () => {
    it('persists data across instances', () => {
      store.addCredits('user1', 100, 'bonus', 'Test');
      store.useCredits('user1', 30, 'Used');
      store.createPurchase('order1', 'user1', 'credit_10', 1000);

      const store2 = new CreditStore(testDir);
      expect(store2.getBalance('user1').credits).toBe(70);
      expect(store2.getPurchase('order1')).toBeTruthy();
    });
  });
});

describe('Helper functions', () => {
  describe('getProductBySku', () => {
    it('returns product for valid SKU', () => {
      const product = getProductBySku('credit_10');
      expect(product?.name).toBe('Starter Pack');
      expect(product?.credits).toBe(10);
    });

    it('returns undefined for invalid SKU', () => {
      expect(getProductBySku('invalid')).toBeUndefined();
    });
  });

  describe('getCreditCost', () => {
    it('returns cost for valid action', () => {
      expect(getCreditCost('ai_chat')).toBe(1);
      expect(getCreditCost('tarot_interpret')).toBe(2);
    });

    it('returns 0 for unknown action', () => {
      expect(getCreditCost('unknown_action')).toBe(0);
    });
  });

  describe('getAllProducts', () => {
    it('returns all products', () => {
      const products = getAllProducts();
      expect(products).toEqual(CREDIT_PRODUCTS);
      expect(products.length).toBeGreaterThan(0);
    });
  });

  describe('getAllCosts', () => {
    it('returns all costs', () => {
      const costs = getAllCosts();
      expect(costs).toHaveProperty('ai_chat');
      expect(costs).toHaveProperty('tarot_interpret');
    });
  });
});
