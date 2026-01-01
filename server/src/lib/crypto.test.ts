import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test encryption key (32 bytes = 64 hex chars)
const TEST_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Mock getConfig before importing crypto module
vi.mock('../config/index.js', () => ({
  getConfig: vi.fn(() => ({
    PROFILE_ENCRYPTION_KEY: TEST_KEY,
  })),
}));

// Import after mocking
import { encrypt, decrypt, hash, generateKey, isEncryptionConfigured } from './crypto.js';
import { getConfig } from '../config/index.js';

describe('crypto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConfig).mockReturnValue({
      PROFILE_ENCRYPTION_KEY: TEST_KEY,
    } as ReturnType<typeof getConfig>);
  });

  describe('encrypt/decrypt', () => {
    it('encrypts and decrypts plaintext correctly', () => {
      const plaintext = '19900115';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertext for same plaintext (random IV)', () => {
      const plaintext = '19900115';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('encrypted format is aes-256-gcm:iv:ciphertext:tag', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');

      expect(parts.length).toBe(4);
      expect(parts[0]).toBe('aes-256-gcm');
      expect(parts[1]).toHaveLength(24); // 12 bytes IV = 24 hex chars
      expect(parts[3]).toHaveLength(32); // 16 bytes tag = 32 hex chars
    });

    it('handles empty string', () => {
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe('');
    });

    it('handles unicode characters', () => {
      const plaintext = '김철수 19900115 한글테스트';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('handles long strings', () => {
      const plaintext = 'a'.repeat(10000);
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('decrypt error handling', () => {
    it('throws on invalid format (missing parts)', () => {
      expect(() => decrypt('invalid')).toThrow('Invalid ciphertext format');
    });

    it('throws on unsupported algorithm', () => {
      expect(() => decrypt('aes-128-gcm:iv:cipher:tag')).toThrow(
        'Unsupported algorithm: aes-128-gcm'
      );
    });

    it('throws on invalid auth tag length', () => {
      // Valid format but wrong tag length
      const iv = '0'.repeat(24);
      const cipher = 'abcd';
      const shortTag = 'ab'; // Should be 32 chars

      expect(() => decrypt(`aes-256-gcm:${iv}:${cipher}:${shortTag}`)).toThrow(
        'Invalid auth tag length'
      );
    });

    it('throws on tampered ciphertext (authentication failure)', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with ciphertext
      parts[2] = 'ff'.repeat(parts[2].length / 2);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });

    it('throws on tampered auth tag', () => {
      const encrypted = encrypt('test');
      const parts = encrypted.split(':');
      // Tamper with auth tag
      parts[3] = 'ff'.repeat(16);
      const tampered = parts.join(':');

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe('hash', () => {
    it('produces consistent hash for same input', () => {
      const hash1 = hash('19900115');
      const hash2 = hash('19900115');

      expect(hash1).toBe(hash2);
    });

    it('produces different hash for different input', () => {
      const hash1 = hash('19900115');
      const hash2 = hash('19900116');

      expect(hash1).not.toBe(hash2);
    });

    it('returns 64 character hex string (SHA-256)', () => {
      const result = hash('test');

      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]+$/);
    });

    it('handles empty string', () => {
      const result = hash('');

      expect(result).toHaveLength(64);
    });

    it('handles unicode', () => {
      const result = hash('한글테스트');

      expect(result).toHaveLength(64);
    });
  });

  describe('generateKey', () => {
    it('returns 64 character hex string', () => {
      const key = generateKey();

      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]+$/);
    });

    it('generates unique keys', () => {
      const key1 = generateKey();
      const key2 = generateKey();

      expect(key1).not.toBe(key2);
    });
  });

  describe('isEncryptionConfigured', () => {
    it('returns true when key is configured', () => {
      expect(isEncryptionConfigured()).toBe(true);
    });

    it('returns false when key is not configured', () => {
      vi.mocked(getConfig).mockReturnValue({
        PROFILE_ENCRYPTION_KEY: undefined,
      } as unknown as ReturnType<typeof getConfig>);

      expect(isEncryptionConfigured()).toBe(false);
    });

    it('returns false when key is empty string', () => {
      vi.mocked(getConfig).mockReturnValue({
        PROFILE_ENCRYPTION_KEY: '',
      } as unknown as ReturnType<typeof getConfig>);

      expect(isEncryptionConfigured()).toBe(false);
    });
  });

  describe('encryption key requirement', () => {
    it('throws when encrypting without key', () => {
      vi.mocked(getConfig).mockReturnValue({
        PROFILE_ENCRYPTION_KEY: undefined,
      } as unknown as ReturnType<typeof getConfig>);

      expect(() => encrypt('test')).toThrow('PROFILE_ENCRYPTION_KEY is not configured');
    });

    it('throws when decrypting without key', () => {
      // First encrypt with key
      vi.mocked(getConfig).mockReturnValue({
        PROFILE_ENCRYPTION_KEY: TEST_KEY,
      } as ReturnType<typeof getConfig>);
      const encrypted = encrypt('test');

      // Then try to decrypt without key
      vi.mocked(getConfig).mockReturnValue({
        PROFILE_ENCRYPTION_KEY: undefined,
      } as unknown as ReturnType<typeof getConfig>);

      expect(() => decrypt(encrypted)).toThrow('PROFILE_ENCRYPTION_KEY is not configured');
    });
  });
});
