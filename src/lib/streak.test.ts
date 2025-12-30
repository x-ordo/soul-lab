import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStreak, wasGraceUsed, clearGraceFlag, updateStreak } from './streak';

// Mock seed module
vi.mock('./seed', () => ({
  todayKey: vi.fn(() => '20250115'),
  yesterdayKey: vi.fn(() => '20250114'),
  dateKey: vi.fn((offset: number) => {
    const base = 20250115;
    return String(base + offset);
  }),
}));

import { todayKey, yesterdayKey, dateKey } from './seed';

describe('getStreak', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns 0 when not set', () => {
    expect(getStreak()).toBe(0);
  });

  it('returns stored value', () => {
    localStorage.setItem('sl_streak', '5');
    expect(getStreak()).toBe(5);
  });

  it('returns 0 for invalid value', () => {
    localStorage.setItem('sl_streak', 'invalid');
    expect(getStreak()).toBe(0);
  });

  it('returns 0 for negative value', () => {
    localStorage.setItem('sl_streak', '-5');
    expect(getStreak()).toBe(0);
  });

  it('floors decimal values', () => {
    localStorage.setItem('sl_streak', '5.7');
    expect(getStreak()).toBe(5);
  });
});

describe('wasGraceUsed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when not set', () => {
    expect(wasGraceUsed()).toBe(false);
  });

  it('returns true when set to true', () => {
    localStorage.setItem('sl_grace_used', 'true');
    expect(wasGraceUsed()).toBe(true);
  });

  it('returns false for any other value', () => {
    localStorage.setItem('sl_grace_used', 'false');
    expect(wasGraceUsed()).toBe(false);
  });
});

describe('clearGraceFlag', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes grace flag', () => {
    localStorage.setItem('sl_grace_used', 'true');
    clearGraceFlag();
    expect(localStorage.getItem('sl_grace_used')).toBeNull();
  });

  it('does not throw when flag not set', () => {
    expect(() => clearGraceFlag()).not.toThrow();
  });
});

describe('updateStreak', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns 1 for first visit', () => {
    expect(updateStreak()).toBe(1);
    expect(getStreak()).toBe(1);
  });

  it('maintains streak for same day visit', () => {
    localStorage.setItem('sl_last_seen', '20250115');
    localStorage.setItem('sl_streak', '5');
    expect(updateStreak()).toBe(5);
    expect(getStreak()).toBe(5);
  });

  it('increments streak for consecutive day visit', () => {
    localStorage.setItem('sl_last_seen', '20250114'); // yesterday
    localStorage.setItem('sl_streak', '5');
    expect(updateStreak()).toBe(6);
    expect(getStreak()).toBe(6);
  });

  it('uses grace day for 2-day gap', () => {
    vi.mocked(dateKey).mockImplementation((offset?: number) => {
      const dates: Record<number, string> = {
        0: '20250115',
        '-1': '20250114',
        '-2': '20250113',
      };
      return dates[offset ?? 0] ?? '20250115';
    });

    localStorage.setItem('sl_last_seen', '20250113'); // two days ago
    localStorage.setItem('sl_streak', '5');
    expect(updateStreak()).toBe(5); // maintained, not increased
    expect(wasGraceUsed()).toBe(true);
  });

  it('resets streak for gap > 2 days', () => {
    vi.mocked(dateKey).mockImplementation((offset?: number) => {
      const dates: Record<number, string> = {
        0: '20250115',
        '-1': '20250114',
        '-2': '20250113',
      };
      return dates[offset ?? 0] ?? '20250115';
    });

    localStorage.setItem('sl_last_seen', '20250110'); // 5 days ago
    localStorage.setItem('sl_streak', '10');
    expect(updateStreak()).toBe(1);
    expect(getStreak()).toBe(1);
  });

  it('clears grace flag on consecutive visit', () => {
    localStorage.setItem('sl_grace_used', 'true');
    localStorage.setItem('sl_last_seen', '20250114'); // yesterday
    localStorage.setItem('sl_streak', '5');
    updateStreak();
    expect(wasGraceUsed()).toBe(false);
  });

  it('updates last seen date', () => {
    updateStreak();
    expect(localStorage.getItem('sl_last_seen')).toBe('20250115');
  });

  it('handles zero previous streak on same day', () => {
    localStorage.setItem('sl_last_seen', '20250115');
    localStorage.setItem('sl_streak', '0');
    expect(updateStreak()).toBe(1);
  });

  it('handles zero previous streak on consecutive day', () => {
    localStorage.setItem('sl_last_seen', '20250114');
    localStorage.setItem('sl_streak', '0');
    expect(updateStreak()).toBe(2); // (0 || 1) + 1 = 2
  });

  it('is idempotent for same day', () => {
    const first = updateStreak();
    const second = updateStreak();
    const third = updateStreak();
    expect(first).toBe(second);
    expect(second).toBe(third);
  });
});
