/**
 * Auth Routes - Session Token Management
 *
 * Provides secure token-based authentication for frontend clients.
 * Tokens are time-limited and signed server-side to keep secrets secure.
 */
import type { FastifyPluginAsync } from 'fastify';
import crypto from 'node:crypto';
import { getConfig } from '../config/index.js';
import { logger } from '../lib/logger.js';

// Token validity duration (5 minutes for API requests)
const TOKEN_TTL_MS = 5 * 60 * 1000;

interface SessionTokenRequest {
  userKey: string;
}

interface SessionToken {
  token: string;
  userKey: string;
  expiresAt: number;
}

/**
 * Generate a session token for authenticated API requests
 */
function generateSessionToken(userKey: string): SessionToken {
  const config = getConfig();
  const secret = config.SIGNING_SECRET;

  if (!secret) {
    throw new Error('SIGNING_SECRET not configured');
  }

  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const message = `session:${userKey}:${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');

  // Token format: base64(userKey):expiresAt:signature
  const token = `${Buffer.from(userKey).toString('base64')}:${expiresAt}:${signature}`;

  return {
    token,
    userKey,
    expiresAt,
  };
}

/**
 * Verify a session token
 */
export function verifySessionToken(token: string): { valid: boolean; userKey?: string; error?: string } {
  const config = getConfig();
  const secret = config.SIGNING_SECRET;

  if (!secret) {
    return { valid: false, error: 'missing_secret' };
  }

  try {
    const parts = token.split(':');
    if (parts.length !== 3) {
      return { valid: false, error: 'invalid_format' };
    }

    const [userKeyB64, expiresAtStr, signature] = parts;
    const userKey = Buffer.from(userKeyB64, 'base64').toString('utf8');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt)) {
      return { valid: false, error: 'invalid_expiry' };
    }

    // Check expiration
    if (Date.now() > expiresAt) {
      return { valid: false, error: 'expired' };
    }

    // Verify signature
    const message = `session:${userKey}:${expiresAt}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(message).digest('hex');

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return { valid: false, error: 'invalid_signature' };
    }

    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return { valid: false, error: 'invalid_signature' };
    }

    return { valid: true, userKey };
  } catch {
    return { valid: false, error: 'parse_error' };
  }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/auth/session
   * Request a session token for authenticated API calls
   */
  app.post<{ Body: SessionTokenRequest }>('/api/auth/session', async (request, reply) => {
    const { userKey } = request.body || {};

    if (!userKey || typeof userKey !== 'string' || userKey.length < 10) {
      return reply.code(400).send({
        error: 'invalid_request',
        message: 'userKey is required and must be at least 10 characters',
      });
    }

    try {
      const sessionToken = generateSessionToken(userKey);

      logger.info({ userKey: userKey.slice(0, 8) + '...' }, 'auth_session_created');

      return reply.send({
        ok: true,
        token: sessionToken.token,
        expiresAt: sessionToken.expiresAt,
        ttlMs: TOKEN_TTL_MS,
      });
    } catch (err) {
      logger.error({ err }, 'auth_session_error');
      return reply.code(500).send({
        error: 'server_error',
        message: 'Failed to generate session token',
      });
    }
  });

  /**
   * POST /api/auth/verify
   * Verify a session token (for debugging/testing)
   */
  app.post<{ Body: { token: string } }>('/api/auth/verify', async (request, reply) => {
    const { token } = request.body || {};

    if (!token || typeof token !== 'string') {
      return reply.code(400).send({
        error: 'invalid_request',
        message: 'token is required',
      });
    }

    const result = verifySessionToken(token);

    return reply.send({
      valid: result.valid,
      userKey: result.valid ? result.userKey?.slice(0, 8) + '...' : undefined,
      error: result.error,
    });
  });
};
