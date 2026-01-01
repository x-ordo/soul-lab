/**
 * Auth Routes - Session Token Management
 *
 * Provides secure token-based authentication for frontend clients.
 * Tokens are time-limited and signed server-side to keep secrets secure.
 */
import type { FastifyPluginAsync } from 'fastify';
import { logger } from '../lib/logger.js';
import {
  generateSessionToken,
  verifySessionToken,
  SESSION_TOKEN_TTL,
} from '../lib/auth.js';

interface SessionTokenRequest {
  userKey: string;
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
        ttlMs: SESSION_TOKEN_TTL,
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
