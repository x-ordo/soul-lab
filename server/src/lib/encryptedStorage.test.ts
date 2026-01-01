/**
 * Encrypted Storage Tests
 *
 * Tests for at-rest encryption of sensitive data files.
 * Issue #19: 민감 데이터 암호화 (at-rest)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Mock config before importing the module
const TEST_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes hex

vi.mock('../config/index.js', () => ({
  getConfig: vi.fn(() => ({
    DATA_ENCRYPTION_KEY: TEST_ENCRYPTION_KEY,
    PROFILE_ENCRYPTION_KEY: undefined,
    NODE_ENV: 'test',
    LOG_LEVEL: 'info',
  })),
  isProduction: vi.fn(() => false),
  isDevelopment: vi.fn(() => false),
}));

// Import after mocking
const {
  readEncryptedJson,
  writeEncryptedJson,
  isDataEncryptionConfigured,
  migrateToEncrypted,
  decryptFile,
  generateEncryptionKey,
} = await import('./encryptedStorage.js');

describe('Encrypted Storage', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'encrypted-storage-test-'));
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    vi.clearAllMocks();
  });

  describe('isDataEncryptionConfigured', () => {
    it('should return true when encryption key is set', () => {
      expect(isDataEncryptionConfigured()).toBe(true);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate 64-character hex key', () => {
      const key = generateEncryptionKey();
      expect(key.length).toBe(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateEncryptionKey());
      }
      expect(keys.size).toBe(100);
    });
  });

  describe('writeEncryptedJson / readEncryptedJson', () => {
    it('should encrypt and decrypt data correctly', () => {
      const filePath = join(testDir, 'test.json');
      const testData = { name: 'test', value: 123, nested: { foo: 'bar' } };

      writeEncryptedJson(filePath, testData);
      const result = readEncryptedJson(filePath, {});

      expect(result).toEqual(testData);
    });

    it('should write encrypted format to file', () => {
      const filePath = join(testDir, 'test.json');
      const testData = { secret: 'sensitive-data' };

      writeEncryptedJson(filePath, testData);

      const raw = readFileSync(filePath, 'utf-8');
      expect(raw.startsWith('v1:')).toBe(true);
      expect(raw).not.toContain('sensitive-data');
    });

    it('should return default value for non-existent file', () => {
      const filePath = join(testDir, 'non-existent.json');
      const defaultValue = { default: true };

      const result = readEncryptedJson(filePath, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should handle arrays', () => {
      const filePath = join(testDir, 'array.json');
      const testData = [{ id: 1 }, { id: 2 }, { id: 3 }];

      writeEncryptedJson(filePath, testData);
      const result = readEncryptedJson(filePath, []);

      expect(result).toEqual(testData);
    });

    it('should handle large data', () => {
      const filePath = join(testDir, 'large.json');
      const testData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          data: 'x'.repeat(100),
        })),
      };

      writeEncryptedJson(filePath, testData);
      const result = readEncryptedJson<typeof testData>(filePath, { items: [] });

      expect(result.items.length).toBe(1000);
      expect(result.items[500].id).toBe(500);
    });

    it('should handle unicode data', () => {
      const filePath = join(testDir, 'unicode.json');
      const testData = {
        korean: '안녕하세요',
        emoji: '🎉🚀💯',
        mixed: 'Hello 世界 🌍',
      };

      writeEncryptedJson(filePath, testData);
      const result = readEncryptedJson(filePath, {});

      expect(result).toEqual(testData);
    });
  });

  describe('Backward Compatibility', () => {
    it('should read plaintext JSON files', () => {
      const filePath = join(testDir, 'plaintext.json');
      const testData = { plaintext: true, value: 42 };

      // Write plaintext JSON directly
      writeFileSync(filePath, JSON.stringify(testData));

      // Should read as plaintext
      const result = readEncryptedJson(filePath, {});
      expect(result).toEqual(testData);
    });
  });

  describe('migrateToEncrypted', () => {
    it('should migrate plaintext file to encrypted', () => {
      const filePath = join(testDir, 'migrate.json');
      const testData = { sensitive: 'data' };

      // Write plaintext
      writeFileSync(filePath, JSON.stringify(testData));

      // Migrate
      const migrated = migrateToEncrypted(filePath);
      expect(migrated).toBe(true);

      // Verify encrypted
      const raw = readFileSync(filePath, 'utf-8');
      expect(raw.startsWith('v1:')).toBe(true);

      // Should still read correctly
      const result = readEncryptedJson(filePath, {});
      expect(result).toEqual(testData);
    });

    it('should not migrate already encrypted file', () => {
      const filePath = join(testDir, 'already-encrypted.json');
      const testData = { already: 'encrypted' };

      writeEncryptedJson(filePath, testData);
      const migrated = migrateToEncrypted(filePath);

      expect(migrated).toBe(false);
    });

    it('should return false for non-existent file', () => {
      const filePath = join(testDir, 'non-existent.json');
      const migrated = migrateToEncrypted(filePath);
      expect(migrated).toBe(false);
    });
  });

  describe('decryptFile', () => {
    it('should decrypt file to plaintext', () => {
      const filePath = join(testDir, 'to-decrypt.json');
      const testData = { secret: 'value' };

      writeEncryptedJson(filePath, testData);
      const decrypted = decryptFile(filePath);

      expect(decrypted).toBe(true);

      // Should be plaintext now
      const raw = readFileSync(filePath, 'utf-8');
      expect(raw.startsWith('v1:')).toBe(false);
      expect(JSON.parse(raw)).toEqual(testData);
    });

    it('should not decrypt already plaintext file', () => {
      const filePath = join(testDir, 'plaintext.json');
      writeFileSync(filePath, JSON.stringify({ plain: true }));

      const decrypted = decryptFile(filePath);
      expect(decrypted).toBe(false);
    });
  });

  describe('Security Properties', () => {
    it('should use different IV for each encryption', () => {
      const filePath1 = join(testDir, 'file1.json');
      const filePath2 = join(testDir, 'file2.json');
      const testData = { same: 'data' };

      writeEncryptedJson(filePath1, testData);
      writeEncryptedJson(filePath2, testData);

      const raw1 = readFileSync(filePath1, 'utf-8');
      const raw2 = readFileSync(filePath2, 'utf-8');

      // Same data should encrypt to different ciphertexts
      expect(raw1).not.toBe(raw2);

      // Extract IV (second part after v1:)
      const iv1 = raw1.split(':')[1];
      const iv2 = raw2.split(':')[1];
      expect(iv1).not.toBe(iv2);
    });

    it('should not expose original data in encrypted file', () => {
      const filePath = join(testDir, 'sensitive.json');
      const testData = {
        password: 'super-secret-password-123',
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789',
      };

      writeEncryptedJson(filePath, testData);
      const raw = readFileSync(filePath, 'utf-8');

      expect(raw).not.toContain('super-secret-password');
      expect(raw).not.toContain('4111');
      expect(raw).not.toContain('123-45');
    });

    it('should fail gracefully with corrupted data', () => {
      const filePath = join(testDir, 'corrupted.json');
      writeFileSync(filePath, 'v1:invalid:corrupted:data');

      // Should return default value, not throw
      const result = readEncryptedJson(filePath, { default: true });
      expect(result).toEqual({ default: true });
    });
  });
});

describe('writeEncryptedJson with explicit encrypt=false', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = mkdtempSync(join(tmpdir(), 'no-encrypt-test-'));
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should write plaintext when encrypt=false', () => {
    const filePath = join(testDir, 'no-encryption.json');
    const testData = { plain: 'text' };

    // Explicitly pass encrypt=false to skip encryption
    writeEncryptedJson(filePath, testData, false);

    const raw = readFileSync(filePath, 'utf-8');
    expect(raw.startsWith('v1:')).toBe(false);
    expect(JSON.parse(raw)).toEqual(testData);
  });

  it('should be readable by readEncryptedJson', () => {
    const filePath = join(testDir, 'plaintext.json');
    const testData = { readable: true };

    writeEncryptedJson(filePath, testData, false);
    const result = readEncryptedJson(filePath, {});

    expect(result).toEqual(testData);
  });
});
