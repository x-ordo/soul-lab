import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { hash32, pickTemplate, dailyScore, chemistryScore, tomorrowHint } from './engine';
import { FORTUNE_TEMPLATES } from '../data/fortuneTemplates';

describe('hash32', () => {
  it('returns a number', () => {
    expect(typeof hash32('test')).toBe('number');
  });

  it('is deterministic - same input produces same output', () => {
    const input = 'user123|19950101|20250101';
    expect(hash32(input)).toBe(hash32(input));
  });

  it('produces different outputs for different inputs', () => {
    expect(hash32('input1')).not.toBe(hash32('input2'));
  });

  it('handles empty string', () => {
    expect(() => hash32('')).not.toThrow();
    expect(typeof hash32('')).toBe('number');
  });

  it('handles special characters', () => {
    expect(() => hash32('한글테스트!@#$%')).not.toThrow();
    expect(typeof hash32('한글테스트!@#$%')).toBe('number');
  });

  it('handles very long strings', () => {
    const longString = 'a'.repeat(10000);
    expect(() => hash32(longString)).not.toThrow();
    expect(typeof hash32(longString)).toBe('number');
  });

  it('returns unsigned 32-bit integer', () => {
    const hash = hash32('test');
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });

  it('produces well-distributed values', () => {
    const hashes = new Set<number>();
    for (let i = 0; i < 1000; i++) {
      hashes.add(hash32(`test-${i}`));
    }
    // Should have high uniqueness (at least 99% unique)
    expect(hashes.size).toBeGreaterThan(990);
  });
});

describe('pickTemplate', () => {
  it('returns a valid FortuneTemplate', () => {
    const template = pickTemplate('user123', '19950101', '20250101');
    expect(template).toBeDefined();
    expect(template).toHaveProperty('id');
    expect(template).toHaveProperty('open');
    expect(template).toHaveProperty('locked');
  });

  it('is deterministic - same inputs return same template', () => {
    const userKey = 'user123';
    const birthDate = '19950101';
    const targetDate = '20250101';

    const template1 = pickTemplate(userKey, birthDate, targetDate);
    const template2 = pickTemplate(userKey, birthDate, targetDate);

    expect(template1.id).toBe(template2.id);
  });

  it('returns different templates for different users', () => {
    const birthDate = '19950101';
    const targetDate = '20250101';

    const templates = new Set<string>();
    for (let i = 0; i < 100; i++) {
      templates.add(pickTemplate(`user${i}`, birthDate, targetDate).id);
    }
    // Should have some variety
    expect(templates.size).toBeGreaterThan(1);
  });

  it('returns different templates for different dates', () => {
    const userKey = 'user123';
    const birthDate = '19950101';

    const templates = new Set<string>();
    for (let i = 1; i <= 31; i++) {
      const targetDate = `202501${String(i).padStart(2, '0')}`;
      templates.add(pickTemplate(userKey, birthDate, targetDate).id);
    }
    // Should have some variety across days
    expect(templates.size).toBeGreaterThan(1);
  });

  it('always returns a template within bounds', () => {
    for (let i = 0; i < 100; i++) {
      const template = pickTemplate(`user${i}`, '19990101', '20250101');
      expect(FORTUNE_TEMPLATES).toContainEqual(template);
    }
  });
});

describe('dailyScore', () => {
  it('returns a number', () => {
    expect(typeof dailyScore('user123', '19950101', '20250101')).toBe('number');
  });

  it('returns score within range [60, 100]', () => {
    const score = dailyScore('user123', '19950101', '20250101');
    expect(score).toBeGreaterThanOrEqual(60);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('is deterministic - same inputs return same score', () => {
    const userKey = 'user123';
    const birthDate = '19950101';
    const targetDate = '20250101';

    expect(dailyScore(userKey, birthDate, targetDate)).toBe(
      dailyScore(userKey, birthDate, targetDate)
    );
  });

  it('returns different scores for different users', () => {
    const birthDate = '19950101';
    const targetDate = '20250101';

    const scores = new Set<number>();
    for (let i = 0; i < 100; i++) {
      scores.add(dailyScore(`user${i}`, birthDate, targetDate));
    }
    // Should have variety in scores
    expect(scores.size).toBeGreaterThan(5);
  });

  it('returns different scores for different dates', () => {
    const userKey = 'user123';
    const birthDate = '19950101';

    const scores = new Set<number>();
    for (let i = 1; i <= 31; i++) {
      const targetDate = `202501${String(i).padStart(2, '0')}`;
      scores.add(dailyScore(userKey, birthDate, targetDate));
    }
    // Should have variety across days
    expect(scores.size).toBeGreaterThan(5);
  });

  it('all scores are within valid range over many iterations', () => {
    for (let i = 0; i < 1000; i++) {
      const score = dailyScore(`user${i}`, '19990101', '20250115');
      expect(score).toBeGreaterThanOrEqual(60);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

describe('chemistryScore', () => {
  it('returns a number', () => {
    expect(typeof chemistryScore('userA', 'userB', '20250101')).toBe('number');
  });

  it('returns score within range [50, 100]', () => {
    const score = chemistryScore('userA', 'userB', '20250101');
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('is symmetric - order of keys does not matter', () => {
    const targetDate = '20250101';
    expect(chemistryScore('userA', 'userB', targetDate)).toBe(
      chemistryScore('userB', 'userA', targetDate)
    );
  });

  it('is deterministic - same inputs return same score', () => {
    expect(chemistryScore('userA', 'userB', '20250101')).toBe(
      chemistryScore('userA', 'userB', '20250101')
    );
  });

  it('returns different scores for different pairs', () => {
    const targetDate = '20250101';
    const scores = new Set<number>();
    for (let i = 0; i < 50; i++) {
      scores.add(chemistryScore(`userA${i}`, `userB${i}`, targetDate));
    }
    // Should have variety
    expect(scores.size).toBeGreaterThan(5);
  });

  it('returns different scores for different dates', () => {
    const scores = new Set<number>();
    for (let i = 1; i <= 31; i++) {
      const targetDate = `202501${String(i).padStart(2, '0')}`;
      scores.add(chemistryScore('userA', 'userB', targetDate));
    }
    // Should have variety across days
    expect(scores.size).toBeGreaterThan(5);
  });

  it('all scores are within valid range over many iterations', () => {
    for (let i = 0; i < 1000; i++) {
      const score = chemistryScore(`userA${i}`, `userB${i}`, '20250115');
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('same user with self still produces valid score', () => {
    const score = chemistryScore('userA', 'userA', '20250101');
    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('tomorrowHint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a string', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
    expect(typeof tomorrowHint('user123', '19950101')).toBe('string');
  });

  it('returns non-empty string', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
    expect(tomorrowHint('user123', '19950101').length).toBeGreaterThan(0);
  });

  it('returns hint ending with ...', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
    expect(tomorrowHint('user123', '19950101')).toMatch(/\.\.\.$/);
  });

  it('returns one of the four possible hints', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
    const possibleHints = [
      '내일은 특별한 기운이 감지됩니다...',
      '밝은 에너지가 다가오고 있습니다...',
      '평온한 하루가 예상됩니다...',
      '신중한 움직임이 필요할 것 같습니다...',
    ];
    expect(possibleHints).toContain(tomorrowHint('user123', '19950101'));
  });

  it('is deterministic for same user and date', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
    const userKey = 'user123';
    const birthDate = '19950101';
    expect(tomorrowHint(userKey, birthDate)).toBe(tomorrowHint(userKey, birthDate));
  });

  it('returns different hints for different users', () => {
    vi.setSystemTime(new Date('2025-01-15T10:00:00+09:00'));
    const hints = new Set<string>();
    for (let i = 0; i < 100; i++) {
      hints.add(tomorrowHint(`user${i}`, '19950101'));
    }
    // Should have variety
    expect(hints.size).toBeGreaterThan(1);
  });

  it('changes hint based on different dates', () => {
    const hints = new Set<string>();
    for (let i = 1; i <= 31; i++) {
      vi.setSystemTime(new Date(`2025-01-${String(i).padStart(2, '0')}T10:00:00+09:00`));
      hints.add(tomorrowHint('user123', '19950101'));
    }
    // Should have variety across days
    expect(hints.size).toBeGreaterThan(1);
  });
});
