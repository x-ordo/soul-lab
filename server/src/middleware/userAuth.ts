/**
 * User Authorization Middleware
 *
 * Validates that the requesting user is authorized to access the requested resource.
 * Uses HMAC signature verification for authentication.
 *
 * Headers required:
 * - X-User-Key: The user's unique identifier
 * - X-Timestamp: Unix timestamp in milliseconds
 * - X-Signature: HMAC-SHA256 signature of "userKey:timestamp"
 *
 * Security: This prevents IDOR attacks and request tampering by verifying
 * that the request was signed with the shared secret.
 */
import type { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import { logger } from '../lib/logger.js';
import { parseSignatureHeaders, verifyUserSignature } from '../lib/auth.js';
import { isDevelopment } from '../config/index.js';

// Endpoints that require user authorization
const PROTECTED_PATTERNS = [
  { method: 'GET', path: '/api/credits/balance' },
  { method: 'GET', path: '/api/credits/purchases' },
  { method: 'GET', path: '/api/credits/pending' },
  { method: 'GET', path: '/api/credits/transactions' },
  { method: 'GET', path: '/api/credits/referral/stats' },
  { method: 'GET', path: '/api/credits/streak/stats' },
  { method: 'GET', path: '/api/credits/streak/history' },
  { method: 'POST', path: '/api/credits/use' },
  { method: 'POST', path: '/api/credits/check' },
  { method: 'POST', path: '/api/credits/purchase/start' },
  { method: 'POST', path: '/api/credits/streak/claim' },
  { method: 'POST', path: '/api/credits/referral/claim' },
];

function isProtectedEndpoint(method: string, url: string): boolean {
  const path = url.split('?')[0]; // Remove query string
  return PROTECTED_PATTERNS.some(
    (p) => p.method === method && path === p.path
  );
}

function extractUserKeyFromRequest(req: FastifyRequest): string | null {
  // From query parameters
  const query = req.query as Record<string, string | undefined>;
  if (query.userKey) {
    return query.userKey;
  }

  // From request body
  const body = req.body as Record<string, unknown> | undefined;
  if (body && typeof body.userKey === 'string') {
    return body.userKey;
  }

  return null;
}

export const userAuthPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip non-protected endpoints
    if (!isProtectedEndpoint(request.method, request.url)) {
      return;
    }

    // Parse signature headers
    const signatureData = parseSignatureHeaders({
      'x-user-key': request.headers['x-user-key'] as string | undefined,
      'x-timestamp': request.headers['x-timestamp'] as string | undefined,
      'x-signature': request.headers['x-signature'] as string | undefined,
    });

    // In development mode, fall back to simple header check if no signature provided
    // SECURITY NOTE: This bypass exists for local development convenience.
    // In production, signature verification is always required.
    if (!signatureData) {
      if (isDevelopment()) {
        // Development-only fallback: check X-User-Key header without HMAC
        logger.debug({ ip: request.ip, url: request.url }, 'user_auth_dev_bypass');
        const authUserKey = request.headers['x-user-key'];
        if (!authUserKey || typeof authUserKey !== 'string') {
          logger.warn({ ip: request.ip, url: request.url }, 'user_auth_missing_header');
          return reply.code(401).send({
            error: 'unauthorized',
            message: 'X-User-Key header required',
          });
        }

        // Verify userKey matches request
        const requestedUserKey = extractUserKeyFromRequest(request);
        if (requestedUserKey && authUserKey !== requestedUserKey) {
          logger.warn(
            { ip: request.ip, authUserKey, requestedUserKey },
            'user_auth_mismatch'
          );
          return reply.code(403).send({
            error: 'forbidden',
            message: 'Cannot access another user\'s data',
          });
        }

        (request as any).verifiedUserKey = authUserKey;
        return;
      }

      logger.warn({ ip: request.ip, url: request.url }, 'user_auth_missing_signature');
      return reply.code(401).send({
        error: 'unauthorized',
        message: 'Authentication headers required (X-User-Key, X-Timestamp, X-Signature)',
      });
    }

    // Verify the signature
    const verification = verifyUserSignature(signatureData);

    if (!verification.valid) {
      logger.warn(
        { ip: request.ip, error: verification.error, userKey: signatureData.userKey },
        'user_auth_signature_invalid'
      );

      if (verification.error === 'expired') {
        return reply.code(401).send({
          error: 'signature_expired',
          message: 'Request signature has expired. Please retry with a fresh timestamp.',
        });
      }

      return reply.code(401).send({
        error: 'invalid_signature',
        message: 'Invalid request signature',
      });
    }

    // Verify the authenticated userKey matches the requested userKey
    const requestedUserKey = extractUserKeyFromRequest(request);
    if (requestedUserKey && verification.userKey !== requestedUserKey) {
      logger.warn(
        { ip: request.ip, authUserKey: verification.userKey, requestedUserKey },
        'user_auth_mismatch'
      );
      return reply.code(403).send({
        error: 'forbidden',
        message: 'Cannot access another user\'s data',
      });
    }

    // Attach verified userKey to request
    (request as any).verifiedUserKey = verification.userKey;
  });
};

/**
 * Type augmentation for verified user key
 */
declare module 'fastify' {
  interface FastifyRequest {
    verifiedUserKey?: string;
  }
}
