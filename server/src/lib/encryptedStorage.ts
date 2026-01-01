/**
 * Encrypted File Storage
 *
 * Provides at-rest encryption for sensitive JSON data files.
 * Uses AES-256-GCM with authenticated encryption.
 *
 * Issue #19: 민감 데이터 암호화 (at-rest)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { writeFileAtomic } from './atomicWrite.js';
import { getConfig } from '../config/index.js';
import { logger } from './logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM (NIST recommendation)
const TAG_LENGTH = 16; // 128 bits auth tag
const VERSION = 'v1'; // For future migration support

// File format: VERSION:IV_HEX:CIPHERTEXT_HEX:AUTH_TAG_HEX

/**
 * Get data encryption key from environment.
 * Falls back to PROFILE_ENCRYPTION_KEY if DATA_ENCRYPTION_KEY not set.
 */
function getDataEncryptionKey(): Buffer | null {
  const config = getConfig();
  const keyHex = config.DATA_ENCRYPTION_KEY || config.PROFILE_ENCRYPTION_KEY;

  if (!keyHex) {
    return null;
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Check if data encryption is configured.
 */
export function isDataEncryptionConfigured(): boolean {
  return getDataEncryptionKey() !== null;
}

/**
 * Encrypt data to a string format.
 */
function encryptData(data: string): string {
  const key = getDataEncryptionKey();
  if (!key) {
    throw new Error('Data encryption key not configured');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${VERSION}:${iv.toString('hex')}:${encrypted}:${tag.toString('hex')}`;
}

/**
 * Decrypt data from encrypted string format.
 */
function decryptData(encryptedString: string): string {
  const key = getDataEncryptionKey();
  if (!key) {
    throw new Error('Data encryption key not configured');
  }

  const parts = encryptedString.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted data format');
  }

  const [version, ivHex, encrypted, tagHex] = parts;

  if (version !== VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }

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
 * Check if a file contains encrypted data.
 */
function isEncryptedFile(content: string): boolean {
  return content.startsWith(`${VERSION}:`);
}

/**
 * Read and decrypt a JSON file.
 *
 * Handles both encrypted and plaintext files for backward compatibility.
 * - If encryption is enabled and file is encrypted, decrypts it.
 * - If encryption is enabled and file is plaintext, reads as-is (migration scenario).
 * - If encryption is disabled, reads as plaintext.
 *
 * @param filePath - Path to the JSON file
 * @param defaultValue - Default value if file doesn't exist
 */
export function readEncryptedJson<T>(filePath: string, defaultValue: T): T {
  if (!existsSync(filePath)) {
    return defaultValue;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');

    if (isDataEncryptionConfigured() && isEncryptedFile(content)) {
      // Encrypted file - decrypt first
      const decrypted = decryptData(content);
      return JSON.parse(decrypted) as T;
    }

    // Plaintext file or encryption disabled
    return JSON.parse(content) as T;
  } catch (err) {
    logger.error({ filePath, err }, 'encrypted_json_read_error');
    return defaultValue;
  }
}

/**
 * Write and encrypt a JSON file.
 *
 * @param filePath - Path to the JSON file
 * @param data - Data to write
 * @param encrypt - Whether to encrypt (default: true if encryption is configured)
 */
export function writeEncryptedJson<T>(
  filePath: string,
  data: T,
  encrypt: boolean = isDataEncryptionConfigured()
): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const json = JSON.stringify(data, null, 2);

  if (encrypt && isDataEncryptionConfigured()) {
    const encrypted = encryptData(json);
    writeFileAtomic(filePath, encrypted);
  } else {
    writeFileAtomic(filePath, json);
  }
}

/**
 * Migrate a plaintext JSON file to encrypted format.
 *
 * @param filePath - Path to the JSON file
 * @returns true if migration was performed, false if already encrypted or file doesn't exist
 */
export function migrateToEncrypted(filePath: string): boolean {
  if (!isDataEncryptionConfigured()) {
    logger.warn({ filePath }, 'migrate_skipped_no_encryption_key');
    return false;
  }

  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');

    if (isEncryptedFile(content)) {
      // Already encrypted
      return false;
    }

    // Parse as JSON to validate
    const data = JSON.parse(content);

    // Write back as encrypted
    writeEncryptedJson(filePath, data, true);

    logger.info({ filePath }, 'file_migrated_to_encrypted');
    return true;
  } catch (err) {
    logger.error({ filePath, err }, 'migrate_to_encrypted_error');
    return false;
  }
}

/**
 * Decrypt a file back to plaintext (for emergency recovery or debugging).
 *
 * @param filePath - Path to the encrypted JSON file
 * @returns true if decryption was performed
 */
export function decryptFile(filePath: string): boolean {
  if (!isDataEncryptionConfigured()) {
    return false;
  }

  if (!existsSync(filePath)) {
    return false;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');

    if (!isEncryptedFile(content)) {
      // Already plaintext
      return false;
    }

    const decrypted = decryptData(content);
    const data = JSON.parse(decrypted);

    // Write back as plaintext
    writeEncryptedJson(filePath, data, false);

    logger.info({ filePath }, 'file_decrypted_to_plaintext');
    return true;
  } catch (err) {
    logger.error({ filePath, err }, 'decrypt_file_error');
    return false;
  }
}

/**
 * Generate a new encryption key for initial setup.
 * Returns 64 hex characters (32 bytes / 256 bits).
 */
export function generateEncryptionKey(): string {
  return randomBytes(32).toString('hex');
}
