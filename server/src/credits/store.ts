/**
 * Credit Store - 크레딧 관리 시스템
 *
 * 인앱결제로 구매한 크레딧을 관리하고, AI 상담 시 차감
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

// ============================================================
// Types
// ============================================================

export interface CreditBalance {
  userKey: string;
  credits: number;
  totalPurchased: number;
  totalUsed: number;
  lastUpdated: string;
}

export interface CreditTransaction {
  id: string;
  userKey: string;
  type: 'purchase' | 'use' | 'refund' | 'bonus';
  amount: number;
  balance: number;
  description: string;
  orderId?: string;
  sku?: string;
  timestamp: string;
}

export interface PurchaseRecord {
  orderId: string;
  userKey: string;
  sku: string;
  credits: number;
  amount: number;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: string;
  completedAt?: string;
}

// ============================================================
// Credit Products Configuration
// ============================================================

export interface CreditProduct {
  sku: string;
  name: string;
  nameKorean: string;
  credits: number;
  price: number; // KRW
  bonus?: number; // 보너스 크레딧
}

export const CREDIT_PRODUCTS: CreditProduct[] = [
  {
    sku: 'credit_10',
    name: 'Starter Pack',
    nameKorean: '체험팩',
    credits: 10,
    price: 1000,
  },
  {
    sku: 'credit_50',
    name: 'Basic Pack',
    nameKorean: '기본팩',
    credits: 50,
    price: 4500,
    bonus: 5, // +5 보너스
  },
  {
    sku: 'credit_150',
    name: 'Premium Pack',
    nameKorean: '프리미엄팩',
    credits: 150,
    price: 12000,
    bonus: 20, // +20 보너스
  },
  {
    sku: 'credit_500',
    name: 'Ultimate Pack',
    nameKorean: '얼티밋팩',
    credits: 500,
    price: 35000,
    bonus: 100, // +100 보너스
  },
];

// ============================================================
// Credit Costs Configuration
// ============================================================

export interface CreditCost {
  action: string;
  actionKorean: string;
  cost: number;
}

export const CREDIT_COSTS: Record<string, CreditCost> = {
  daily_fortune: {
    action: 'daily_fortune',
    actionKorean: '일일 운세 AI 해석',
    cost: 1,
  },
  tarot_interpret: {
    action: 'tarot_interpret',
    actionKorean: '타로 AI 해석',
    cost: 2,
  },
  ai_chat: {
    action: 'ai_chat',
    actionKorean: 'AI 상담 1회',
    cost: 1,
  },
  synastry_analysis: {
    action: 'synastry_analysis',
    actionKorean: '궁합 AI 분석',
    cost: 3,
  },
  detailed_report: {
    action: 'detailed_report',
    actionKorean: '상세 리포트',
    cost: 5,
  },
};

// ============================================================
// Credit Store Class
// ============================================================

export class CreditStore {
  private dataDir: string;
  private balancesFile: string;
  private transactionsFile: string;
  private purchasesFile: string;

  private balances: Map<string, CreditBalance> = new Map();
  private transactions: CreditTransaction[] = [];
  private purchases: Map<string, PurchaseRecord> = new Map();

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.balancesFile = join(dataDir, 'credit_balances.json');
    this.transactionsFile = join(dataDir, 'credit_transactions.json');
    this.purchasesFile = join(dataDir, 'credit_purchases.json');
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.dataDir)) {
        mkdirSync(this.dataDir, { recursive: true });
      }

      if (existsSync(this.balancesFile)) {
        const data = JSON.parse(readFileSync(this.balancesFile, 'utf-8'));
        this.balances = new Map(Object.entries(data));
      }

      if (existsSync(this.transactionsFile)) {
        this.transactions = JSON.parse(readFileSync(this.transactionsFile, 'utf-8'));
      }

      if (existsSync(this.purchasesFile)) {
        const data = JSON.parse(readFileSync(this.purchasesFile, 'utf-8'));
        this.purchases = new Map(Object.entries(data));
      }
    } catch (e) {
      console.error('CreditStore load error:', e);
    }
  }

  private save(): void {
    try {
      const dir = dirname(this.balancesFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(
        this.balancesFile,
        JSON.stringify(Object.fromEntries(this.balances), null, 2)
      );
      writeFileSync(
        this.transactionsFile,
        JSON.stringify(this.transactions.slice(-10000), null, 2) // 최근 10000건만 유지
      );
      writeFileSync(
        this.purchasesFile,
        JSON.stringify(Object.fromEntries(this.purchases), null, 2)
      );
    } catch (e) {
      console.error('CreditStore save error:', e);
    }
  }

  // ----------------------------------------------------------
  // Balance Operations
  // ----------------------------------------------------------

  /**
   * 사용자 크레딧 잔액 조회
   */
  getBalance(userKey: string): CreditBalance {
    const existing = this.balances.get(userKey);
    if (existing) return existing;

    const newBalance: CreditBalance = {
      userKey,
      credits: 0,
      totalPurchased: 0,
      totalUsed: 0,
      lastUpdated: new Date().toISOString(),
    };
    this.balances.set(userKey, newBalance);
    this.save();
    return newBalance;
  }

  /**
   * 크레딧이 충분한지 확인
   */
  hasEnoughCredits(userKey: string, amount: number): boolean {
    const balance = this.getBalance(userKey);
    return balance.credits >= amount;
  }

  // ----------------------------------------------------------
  // Credit Operations
  // ----------------------------------------------------------

  /**
   * 크레딧 추가 (구매, 보너스 등)
   */
  addCredits(
    userKey: string,
    amount: number,
    type: 'purchase' | 'bonus' | 'refund',
    description: string,
    orderId?: string,
    sku?: string
  ): CreditTransaction {
    const balance = this.getBalance(userKey);
    balance.credits += amount;
    if (type === 'purchase') {
      balance.totalPurchased += amount;
    }
    balance.lastUpdated = new Date().toISOString();

    const transaction: CreditTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userKey,
      type,
      amount,
      balance: balance.credits,
      description,
      orderId,
      sku,
      timestamp: new Date().toISOString(),
    };

    this.transactions.push(transaction);
    this.balances.set(userKey, balance);
    this.save();

    return transaction;
  }

  /**
   * 크레딧 사용 (차감)
   */
  useCredits(
    userKey: string,
    amount: number,
    description: string
  ): { success: boolean; transaction?: CreditTransaction; error?: string } {
    const balance = this.getBalance(userKey);

    if (balance.credits < amount) {
      return {
        success: false,
        error: 'insufficient_credits',
      };
    }

    balance.credits -= amount;
    balance.totalUsed += amount;
    balance.lastUpdated = new Date().toISOString();

    const transaction: CreditTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userKey,
      type: 'use',
      amount: -amount,
      balance: balance.credits,
      description,
      timestamp: new Date().toISOString(),
    };

    this.transactions.push(transaction);
    this.balances.set(userKey, balance);
    this.save();

    return { success: true, transaction };
  }

  // ----------------------------------------------------------
  // Purchase Operations
  // ----------------------------------------------------------

  /**
   * 구매 기록 생성 (결제 시작)
   */
  createPurchase(
    orderId: string,
    userKey: string,
    sku: string,
    amount: number
  ): PurchaseRecord {
    const product = CREDIT_PRODUCTS.find(p => p.sku === sku);
    const credits = product ? product.credits + (product.bonus || 0) : 0;

    const purchase: PurchaseRecord = {
      orderId,
      userKey,
      sku,
      credits,
      amount,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.purchases.set(orderId, purchase);
    this.save();

    return purchase;
  }

  /**
   * 구매 완료 처리 (상품 지급)
   */
  completePurchase(orderId: string): {
    success: boolean;
    purchase?: PurchaseRecord;
    transaction?: CreditTransaction;
    error?: string;
  } {
    const purchase = this.purchases.get(orderId);

    if (!purchase) {
      return { success: false, error: 'purchase_not_found' };
    }

    if (purchase.status === 'completed') {
      return { success: false, error: 'already_completed' };
    }

    if (purchase.status === 'refunded') {
      return { success: false, error: 'already_refunded' };
    }

    // 크레딧 지급
    const product = CREDIT_PRODUCTS.find(p => p.sku === purchase.sku);
    const productName = product?.nameKorean || purchase.sku;
    const description = `${productName} 구매 (+${purchase.credits} 크레딧)`;

    const transaction = this.addCredits(
      purchase.userKey,
      purchase.credits,
      'purchase',
      description,
      orderId,
      purchase.sku
    );

    // 구매 상태 업데이트
    purchase.status = 'completed';
    purchase.completedAt = new Date().toISOString();
    this.purchases.set(orderId, purchase);
    this.save();

    return { success: true, purchase, transaction };
  }

  /**
   * 구매 조회
   */
  getPurchase(orderId: string): PurchaseRecord | undefined {
    return this.purchases.get(orderId);
  }

  /**
   * 사용자의 구매 이력 조회
   */
  getUserPurchases(userKey: string): PurchaseRecord[] {
    return Array.from(this.purchases.values())
      .filter(p => p.userKey === userKey)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * 미완료 구매 조회 (복원용)
   */
  getPendingPurchases(userKey: string): PurchaseRecord[] {
    return Array.from(this.purchases.values())
      .filter(p => p.userKey === userKey && p.status === 'pending');
  }

  // ----------------------------------------------------------
  // Transaction History
  // ----------------------------------------------------------

  /**
   * 사용자 트랜잭션 이력 조회
   */
  getTransactionHistory(userKey: string, limit: number = 50): CreditTransaction[] {
    return this.transactions
      .filter(t => t.userKey === userKey)
      .slice(-limit)
      .reverse();
  }
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * SKU로 상품 정보 조회
 */
export function getProductBySku(sku: string): CreditProduct | undefined {
  return CREDIT_PRODUCTS.find(p => p.sku === sku);
}

/**
 * 액션별 크레딧 비용 조회
 */
export function getCreditCost(action: string): number {
  return CREDIT_COSTS[action]?.cost || 0;
}

/**
 * 전체 상품 목록 조회
 */
export function getAllProducts(): CreditProduct[] {
  return CREDIT_PRODUCTS;
}

/**
 * 전체 비용 정보 조회
 */
export function getAllCosts(): Record<string, CreditCost> {
  return CREDIT_COSTS;
}
