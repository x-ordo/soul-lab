import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { todayKey, dateKey, yesterdayKey, hash32, mulberry32, pick, clamp, isYYYYMMDD } from './seed';

describe('todayKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 8-character string', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
    const key = todayKey();
    expect(key).toHaveLength(8);
  });

  it('returns YYYYMMDD format', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
    const key = todayKey();
    expect(key).toMatch(/^\d{8}$/);
  });

  it('returns correct date for KST morning', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
    expect(todayKey()).toBe('20250115');
  });

  it('returns correct date for KST midnight', () => {
    vi.setSystemTime(new Date('2025-01-15T00:30:00+09:00'));
    expect(todayKey()).toBe('20250115');
  });

  it('handles KST timezone correctly (UTC midnight = KST 9am)', () => {
    // UTC 2025-01-14 15:00 = KST 2025-01-15 00:00
    vi.setSystemTime(new Date('2025-01-14T15:00:00Z'));
    expect(todayKey()).toBe('20250115');
  });

  it('handles UTC before KST day change', () => {
    // UTC 2025-01-14 14:59 = KST 2025-01-14 23:59
    vi.setSystemTime(new Date('2025-01-14T14:59:00Z'));
    expect(todayKey()).toBe('20250114');
  });
});

describe('dateKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today with offset 0', () => {
    expect(dateKey(0)).toBe('20250115');
  });

  it('returns tomorrow with offset 1', () => {
    expect(dateKey(1)).toBe('20250116');
  });

  it('returns yesterday with offset -1', () => {
    expect(dateKey(-1)).toBe('20250114');
  });

  it('handles month boundary', () => {
    vi.setSystemTime(new Date('2025-01-31T10:00:00+09:00'));
    expect(dateKey(1)).toBe('20250201');
  });

  it('handles year boundary', () => {
    vi.setSystemTime(new Date('2025-12-31T10:00:00+09:00'));
    expect(dateKey(1)).toBe('20260101');
  });

  it('handles negative month boundary', () => {
    vi.setSystemTime(new Date('2025-02-01T10:00:00+09:00'));
    expect(dateKey(-1)).toBe('20250131');
  });

  it('handles large positive offset', () => {
    expect(dateKey(30)).toBe('20250214');
  });

  it('handles large negative offset', () => {
    expect(dateKey(-15)).toBe('20241231');
  });
});

describe('yesterdayKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns yesterday date', () => {
    expect(yesterdayKey()).toBe('20250114');
  });

  it('equals dateKey(-1)', () => {
    expect(yesterdayKey()).toBe(dateKey(-1));
  });
});

describe('hash32', () => {
  it('returns a number', () => {
    expect(typeof hash32('test')).toBe('number');
  });

  it('is deterministic', () => {
    expect(hash32('test')).toBe(hash32('test'));
  });

  it('produces different results for different inputs', () => {
    expect(hash32('input1')).not.toBe(hash32('input2'));
  });

  it('handles empty string', () => {
    expect(() => hash32('')).not.toThrow();
    expect(typeof hash32('')).toBe('number');
  });

  it('handles special characters', () => {
    expect(() => hash32('한글테스트!@#$%')).not.toThrow();
  });

  it('returns unsigned 32-bit integer', () => {
    const result = hash32('test');
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(0xffffffff);
  });

  it('produces well-distributed values', () => {
    const hashes = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      hashes.add(hash32(`test-${i}`));
    }
    expect(hashes.size).toBeGreaterThan(990);
  });
});

describe('mulberry32', () => {
  it('returns a function', () => {
    expect(typeof mulberry32(12345)).toBe('function');
  });

  it('returned function produces numbers', () => {
    const rng = mulberry32(12345);
    expect(typeof rng()).toBe('number');
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic - same seed produces same sequence', () => {
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(rng1()).toBe(rng2());
    }
  });

  it('different seeds produce different sequences', () => {
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);
    // First values should differ
    expect(rng1()).not.toBe(rng2());
  });

  it('produces uniform distribution', () => {
    const rng = mulberry32(12345);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      sum += rng();
    }
    const avg = sum / n;
    // Should be close to 0.5
    expect(avg).toBeGreaterThan(0.45);
    expect(avg).toBeLessThan(0.55);
  });
});

describe('pick', () => {
  it('returns an element from the array', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const rng = mulberry32(12345);
    const result = pick(rng, arr);
    expect(arr).toContain(result);
  });

  it('is deterministic with same rng', () => {
    const arr = [1, 2, 3, 4, 5];
    const rng1 = mulberry32(42);
    const rng2 = mulberry32(42);
    expect(pick(rng1, arr)).toBe(pick(rng2, arr));
  });

  it('picks different elements over multiple calls', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    const rng = mulberry32(12345);
    const picks = new Set<string>();
    for (let i = 0; i < 100; i++) {
      picks.add(pick(rng, arr));
    }
    // Should pick at least 3 different elements
    expect(picks.size).toBeGreaterThan(2);
  });

  it('works with single-element array', () => {
    const rng = mulberry32(12345);
    expect(pick(rng, ['only'])).toBe('only');
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('returns min when value below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('returns max when value above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns min when value equals min', () => {
    expect(clamp(0, 0, 10)).toBe(0);
  });

  it('returns max when value equals max', () => {
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('handles negative range', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });

  it('handles floating point values', () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(-0.1, 0, 1)).toBe(0);
    expect(clamp(1.5, 0, 1)).toBe(1);
  });
});

describe('isYYYYMMDD', () => {
  it('returns true for valid 8-digit date', () => {
    expect(isYYYYMMDD('20250115')).toBe(true);
  });

  it('returns true for any 8 digits', () => {
    expect(isYYYYMMDD('12345678')).toBe(true);
    expect(isYYYYMMDD('00000000')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isYYYYMMDD('')).toBe(false);
  });

  it('returns false for too short', () => {
    expect(isYYYYMMDD('2025011')).toBe(false);
  });

  it('returns false for too long', () => {
    expect(isYYYYMMDD('202501150')).toBe(false);
  });

  it('returns false for hyphenated date', () => {
    expect(isYYYYMMDD('2025-01-15')).toBe(false);
  });

  it('returns false for non-numeric', () => {
    expect(isYYYYMMDD('2025Jan5')).toBe(false);
    expect(isYYYYMMDD('abcdefgh')).toBe(false);
  });
});
