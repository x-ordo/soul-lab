/**
 * Credits API Routes
 *
 * 크레딧 관리 및 인앱결제 연동 API
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CreditStore,
  CREDIT_PRODUCTS,
  CREDIT_COSTS,
  getProductBySku,
  getCreditCost,
  getAllProducts,
  getAllCosts,
} from '../credits/store.js';

// ============================================================
// Types
// ============================================================

interface BalanceRequest {
  userKey: string;
}

interface UseCreditsRequest {
  userKey: string;
  action: string;
  description?: string;
}

interface PurchaseStartRequest {
  userKey: string;
  orderId: string;
  sku: string;
  amount: number;
}

interface PurchaseCompleteRequest {
  orderId: string;
}

interface PurchaseHistoryRequest {
  userKey: string;
}

interface TransactionHistoryRequest {
  userKey: string;
  limit?: number;
}

// ============================================================
// Store Instance
// ============================================================

let creditStore: CreditStore;

// ============================================================
// Route Registration
// ============================================================

export async function creditRoutes(
  app: FastifyInstance,
  opts: { dataDir: string }
): Promise<void> {
  // Initialize credit store
  creditStore = new CreditStore(opts.dataDir);

  // ----------------------------------------------------------
  // Product & Cost Info
  // ----------------------------------------------------------

  /**
   * GET /api/credits/products
   * 크레딧 상품 목록 조회
   */
  app.get('/api/credits/products', async () => {
    return {
      success: true,
      products: getAllProducts().map(p => ({
        ...p,
        totalCredits: p.credits + (p.bonus || 0),
        priceFormatted: `₩${p.price.toLocaleString()}`,
      })),
    };
  });

  /**
   * GET /api/credits/costs
   * 크레딧 사용 비용 조회
   */
  app.get('/api/credits/costs', async () => {
    return {
      success: true,
      costs: getAllCosts(),
    };
  });

  // ----------------------------------------------------------
  // Balance Operations
  // ----------------------------------------------------------

  /**
   * GET /api/credits/balance?userKey=xxx
   * 크레딧 잔액 조회
   */
  app.get('/api/credits/balance', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { userKey?: string };

    if (!query.userKey) {
      return reply.code(400).send({ error: 'userKey required' });
    }

    const balance = creditStore.getBalance(query.userKey);

    return {
      success: true,
      balance: {
        credits: balance.credits,
        totalPurchased: balance.totalPurchased,
        totalUsed: balance.totalUsed,
        lastUpdated: balance.lastUpdated,
      },
    };
  });

  /**
   * POST /api/credits/check
   * 크레딧 충분 여부 확인
   */
  app.post('/api/credits/check', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as UseCreditsRequest;

    if (!body.userKey || !body.action) {
      return reply.code(400).send({ error: 'userKey and action required' });
    }

    const cost = getCreditCost(body.action);
    if (cost === 0) {
      return reply.code(400).send({ error: 'invalid action' });
    }

    const hasEnough = creditStore.hasEnoughCredits(body.userKey, cost);
    const balance = creditStore.getBalance(body.userKey);

    return {
      success: true,
      hasEnough,
      cost,
      currentBalance: balance.credits,
      shortfall: hasEnough ? 0 : cost - balance.credits,
    };
  });

  /**
   * POST /api/credits/use
   * 크레딧 사용 (차감)
   */
  app.post('/api/credits/use', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as UseCreditsRequest;

    if (!body.userKey || !body.action) {
      return reply.code(400).send({ error: 'userKey and action required' });
    }

    const costInfo = CREDIT_COSTS[body.action];
    if (!costInfo) {
      return reply.code(400).send({ error: 'invalid action' });
    }

    const description = body.description || costInfo.actionKorean;
    const result = creditStore.useCredits(body.userKey, costInfo.cost, description);

    if (!result.success) {
      return reply.code(402).send({
        error: result.error,
        message: '크레딧이 부족합니다.',
        required: costInfo.cost,
        current: creditStore.getBalance(body.userKey).credits,
      });
    }

    return {
      success: true,
      transaction: result.transaction,
      remainingCredits: creditStore.getBalance(body.userKey).credits,
    };
  });

  // ----------------------------------------------------------
  // Purchase Operations (IAP Integration)
  // ----------------------------------------------------------

  /**
   * POST /api/credits/purchase/start
   * 구매 시작 (주문 생성)
   * - 인앱결제 시작 전에 호출
   */
  app.post('/api/credits/purchase/start', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as PurchaseStartRequest;

    if (!body.userKey || !body.orderId || !body.sku) {
      return reply.code(400).send({ error: 'userKey, orderId, and sku required' });
    }

    const product = getProductBySku(body.sku);
    if (!product) {
      return reply.code(400).send({ error: 'invalid sku' });
    }

    // 이미 존재하는 주문인지 확인
    const existingPurchase = creditStore.getPurchase(body.orderId);
    if (existingPurchase) {
      return reply.code(409).send({
        error: 'order_exists',
        purchase: existingPurchase,
      });
    }

    const purchase = creditStore.createPurchase(
      body.orderId,
      body.userKey,
      body.sku,
      body.amount || product.price
    );

    return {
      success: true,
      purchase: {
        orderId: purchase.orderId,
        sku: purchase.sku,
        credits: purchase.credits,
        status: purchase.status,
      },
    };
  });

  /**
   * POST /api/credits/purchase/complete
   * 구매 완료 (상품 지급)
   * - 인앱결제 processProductGrant 콜백에서 호출
   */
  app.post('/api/credits/purchase/complete', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as PurchaseCompleteRequest;

    if (!body.orderId) {
      return reply.code(400).send({ error: 'orderId required' });
    }

    const result = creditStore.completePurchase(body.orderId);

    if (!result.success) {
      const statusCode = result.error === 'purchase_not_found' ? 404 : 409;
      return reply.code(statusCode).send({ error: result.error });
    }

    return {
      success: true,
      purchase: result.purchase,
      transaction: result.transaction,
      newBalance: creditStore.getBalance(result.purchase!.userKey).credits,
    };
  });

  /**
   * GET /api/credits/purchase/:orderId
   * 구매 상태 조회
   */
  app.get('/api/credits/purchase/:orderId', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = req.params as { orderId: string };

    const purchase = creditStore.getPurchase(params.orderId);
    if (!purchase) {
      return reply.code(404).send({ error: 'purchase_not_found' });
    }

    return {
      success: true,
      purchase,
    };
  });

  /**
   * GET /api/credits/purchases?userKey=xxx
   * 사용자 구매 이력 조회
   */
  app.get('/api/credits/purchases', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { userKey?: string };

    if (!query.userKey) {
      return reply.code(400).send({ error: 'userKey required' });
    }

    const purchases = creditStore.getUserPurchases(query.userKey);

    return {
      success: true,
      purchases,
    };
  });

  /**
   * GET /api/credits/pending?userKey=xxx
   * 미완료 구매 조회 (복원용)
   */
  app.get('/api/credits/pending', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { userKey?: string };

    if (!query.userKey) {
      return reply.code(400).send({ error: 'userKey required' });
    }

    const pending = creditStore.getPendingPurchases(query.userKey);

    return {
      success: true,
      pending,
    };
  });

  // ----------------------------------------------------------
  // Transaction History
  // ----------------------------------------------------------

  /**
   * GET /api/credits/transactions?userKey=xxx&limit=50
   * 크레딧 사용 내역 조회
   */
  app.get('/api/credits/transactions', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = req.query as { userKey?: string; limit?: string };

    if (!query.userKey) {
      return reply.code(400).send({ error: 'userKey required' });
    }

    const limit = Math.min(parseInt(query.limit || '50', 10), 100);
    const transactions = creditStore.getTransactionHistory(query.userKey, limit);

    return {
      success: true,
      transactions,
    };
  });
}
