/**
 * Cryptographic utilities for sensitive data protection.
 * Uses AES-256-GCM for encryption at rest.
 */
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { getConfig } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Get encryption key from config.
 * Key must be 32 bytes (256 bits) in hex format.
 */
function getEncryptionKey(): Buffer {
  const keyHex = getConfig().PROFILE_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('PROFILE_ENCRYPTION_KEY is not configured');
  }
  // Length is validated by config schema (64 chars = 32 bytes hex)
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 * Returns format: "aes-256-gcm:iv:ciphertext:tag"
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${ALGORITHM}:${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Decrypt ciphertext encrypted with encrypt().
 * Expects format: "aes-256-gcm:iv:ciphertext:tag"
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid ciphertext format');
  }

  const [algo, ivHex, encrypted, tagHex] = parts;
  if (algo !== ALGORITHM) {
    throw new Error(`Unsupported algorithm: ${algo}`);
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  if (tag.length !== TAG_LENGTH) {
    throw new Error('Invalid auth tag length');
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Hash plaintext using SHA-256.
 * Useful for analytics without exposing actual data.
 */
export function hash(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Generate a random encryption key for initial setup.
 * Returns 64 hex characters (32 bytes).
 */
export function generateKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Check if encryption is configured.
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}
