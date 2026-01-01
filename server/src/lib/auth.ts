/**
 * Authentication utilities - JWT + bcrypt + HMAC
 */
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getConfig, isDevelopment } from '../config/index.js';

const TOKEN_EXPIRY = '24h';
const SALT_ROUNDS = 12;

export interface AdminTokenPayload {
  role: 'admin';
  iat: number;
  exp: number;
}

/**
 * Hash a password using bcrypt
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Generate JWT token for admin
 */
export function generateAdminToken(): string {
  const config = getConfig();
  const secret = config.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign({ role: 'admin' }, secret, {
    expiresIn: TOKEN_EXPIRY,
  });
}

/**
 * Verify JWT token and return payload
 * Returns null if token is invalid or expired
 */
export function verifyAdminToken(token: string): AdminTokenPayload | null {
  const config = getConfig();
  const secret = config.JWT_SECRET;

  if (!secret) {
    return null;
  }

  try {
    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    if (payload.role !== 'admin') {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Simple in-memory rate limiter for login attempts
 */
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now >= record.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOCKOUT_MS });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  record.count++;
  return { allowed: true };
}

export function resetLoginAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * Cleanup old rate limit records (call periodically)
 */
export function cleanupLoginAttempts(): void {
  const now = Date.now();
  for (const [ip, record] of loginAttempts) {
    if (now >= record.resetAt) {
      loginAttempts.delete(ip);
    }
  }
}

// ============================================================
// HMAC User Signature Verification
// ============================================================

const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes (replay attack window)

export interface UserSignatureData {
  userKey: string;
  timestamp: number;
  signature: string;
}

/**
 * Generate HMAC signature for user request
 * Used by frontend to sign requests
 */
export function generateUserSignature(userKey: string, timestamp: number): string {
  const config = getConfig();
  const secret = config.SIGNING_SECRET;

  if (!secret) {
    throw new Error('SIGNING_SECRET not configured');
  }

  const message = `${userKey}:${timestamp}`;
  return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

/**
 * Verify HMAC signature from user request
 * Returns userKey if valid, null otherwise
 */
export function verifyUserSignature(data: UserSignatureData): {
  valid: boolean;
  userKey?: string;
  error?: 'missing_secret' | 'expired' | 'invalid_signature' | 'dev_mode';
} {
  const config = getConfig();
  const secret = config.SIGNING_SECRET;

  // In development, allow requests without signature
  if (!secret) {
    if (isDevelopment()) {
      console.warn('[Auth] SIGNING_SECRET not set, skipping signature verification in development');
      return { valid: true, userKey: data.userKey, error: 'dev_mode' };
    }
    return { valid: false, error: 'missing_secret' };
  }

  const now = Date.now();

  // Check timestamp freshness (prevent replay attacks)
  if (Math.abs(now - data.timestamp) > SIGNATURE_MAX_AGE_MS) {
    return { valid: false, error: 'expired' };
  }

  // Generate expected signature
  const expectedSignature = generateUserSignature(data.userKey, data.timestamp);

  // Constant-time comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(data.signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return { valid: false, error: 'invalid_signature' };
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return { valid: false, error: 'invalid_signature' };
  }

  return { valid: true, userKey: data.userKey };
}

/**
 * Parse signature headers from request
 */
export function parseSignatureHeaders(headers: {
  'x-user-key'?: string;
  'x-timestamp'?: string;
  'x-signature'?: string;
}): UserSignatureData | null {
  const userKey = headers['x-user-key'];
  const timestampStr = headers['x-timestamp'];
  const signature = headers['x-signature'];

  if (!userKey || !timestampStr || !signature) {
    return null;
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return null;
  }

  return { userKey, timestamp, signature };
}

// ============================================================
// Session Token Verification
// ============================================================

const SESSION_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface SessionToken {
  token: string;
  userKey: string;
  expiresAt: number;
}

/**
 * Generate a session token for authenticated API requests
 */
export function generateSessionToken(userKey: string): SessionToken {
  const config = getConfig();
  const secret = config.SIGNING_SECRET;

  if (!secret) {
    throw new Error('SIGNING_SECRET not configured');
  }

  const expiresAt = Date.now() + SESSION_TOKEN_TTL_MS;
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
export function verifySessionToken(token: string): {
  valid: boolean;
  userKey?: string;
  error?: 'missing_secret' | 'invalid_format' | 'invalid_expiry' | 'expired' | 'invalid_signature' | 'parse_error';
} {
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

export const SESSION_TOKEN_TTL = SESSION_TOKEN_TTL_MS;
