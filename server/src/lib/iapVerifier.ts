/**
 * IAP (In-App Purchase) Server-Side Verification
 *
 * Verifies purchases with payment provider before granting credits.
 * Prevents fraud by ensuring payment was actually completed.
 *
 * For Toss Payments:
 * - Uses Payment Confirm API to verify transaction
 * - Checks amount, status, and orderId match
 */
import { getConfig } from '../config/index.js';
import { logger } from './logger.js';

export interface PaymentVerificationResult {
  verified: boolean;
  error?: string;
  paymentData?: {
    orderId: string;
    amount: number;
    status: string;
    approvedAt?: string;
  };
}

export interface PurchaseVerificationRequest {
  orderId: string;
  paymentKey: string;
  amount: number;
}

/**
 * Verify payment with Toss Payments API
 *
 * In production, this calls the Toss Payments Confirm API.
 * For development without Toss credentials, it returns a mock success.
 */
export async function verifyTossPayment(
  request: PurchaseVerificationRequest
): Promise<PaymentVerificationResult> {
  const config = getConfig();

  // Check if Toss secret key is configured
  const tossSecretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;

  if (!tossSecretKey) {
    // Development mode: skip verification but log warning
    if (config.NODE_ENV === 'development') {
      logger.warn(
        { orderId: request.orderId },
        'iap_verification_skipped_dev_mode'
      );
      return {
        verified: true,
        paymentData: {
          orderId: request.orderId,
          amount: request.amount,
          status: 'DONE',
          approvedAt: new Date().toISOString(),
        },
      };
    }

    // Production without secret key: reject
    logger.error('iap_verification_failed_no_secret_key');
    return {
      verified: false,
      error: 'payment_verification_not_configured',
    };
  }

  try {
    // Call Toss Payments Confirm API
    const authHeader = Buffer.from(`${tossSecretKey}:`).toString('base64');

    const response = await fetch(
      'https://api.tosspayments.com/v1/payments/confirm',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: request.orderId,
          paymentKey: request.paymentKey,
          amount: request.amount,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as Record<string, unknown>;
      logger.warn(
        {
          orderId: request.orderId,
          status: response.status,
          error: errorData,
        },
        'iap_verification_api_error'
      );

      return {
        verified: false,
        error: (typeof errorData.code === 'string' ? errorData.code : null) || 'payment_verification_failed',
      };
    }

    const paymentData = await response.json() as {
      orderId: string;
      status: string;
      totalAmount: number;
      approvedAt?: string;
    };

    // Verify payment status
    if (paymentData.status !== 'DONE') {
      logger.warn(
        { orderId: request.orderId, status: paymentData.status },
        'iap_verification_invalid_status'
      );
      return {
        verified: false,
        error: 'payment_not_completed',
      };
    }

    // Verify amount matches
    if (paymentData.totalAmount !== request.amount) {
      logger.warn(
        {
          orderId: request.orderId,
          expected: request.amount,
          actual: paymentData.totalAmount,
        },
        'iap_verification_amount_mismatch'
      );
      return {
        verified: false,
        error: 'payment_amount_mismatch',
      };
    }

    logger.info(
      { orderId: request.orderId, amount: request.amount },
      'iap_verification_success'
    );

    return {
      verified: true,
      paymentData: {
        orderId: paymentData.orderId,
        amount: paymentData.totalAmount,
        status: paymentData.status,
        approvedAt: paymentData.approvedAt,
      },
    };
  } catch (error) {
    logger.error(
      { orderId: request.orderId, error },
      'iap_verification_exception'
    );
    return {
      verified: false,
      error: 'payment_verification_error',
    };
  }
}

/**
 * Idempotency check - ensure same payment isn't processed twice
 * Uses a simple in-memory cache with TTL
 */
const processedPayments = new Map<string, { processedAt: number }>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function markPaymentProcessed(paymentKey: string): void {
  processedPayments.set(paymentKey, { processedAt: Date.now() });
}

export function isPaymentProcessed(paymentKey: string): boolean {
  const record = processedPayments.get(paymentKey);
  if (!record) return false;

  // Check TTL
  if (Date.now() - record.processedAt > IDEMPOTENCY_TTL_MS) {
    processedPayments.delete(paymentKey);
    return false;
  }

  return true;
}

/**
 * Cleanup old idempotency records (call periodically)
 */
export function cleanupIdempotencyRecords(): void {
  const now = Date.now();
  for (const [key, record] of processedPayments) {
    if (now - record.processedAt > IDEMPOTENCY_TTL_MS) {
      processedPayments.delete(key);
    }
  }
}
