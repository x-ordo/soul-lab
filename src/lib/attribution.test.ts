import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAttribution,
  setAttribution,
  captureAttributionFromUrl,
  Attribution,
} from './attribution';

// Mock todayKey
vi.mock('./seed', () => ({
  todayKey: vi.fn(() => '20250115'),
}));

describe('getAttribution', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when not set', () => {
    expect(getAttribution()).toBeNull();
  });

  it('returns stored attribution', () => {
    const attribution: Attribution = {
      entryType: 'solo',
      dateKey: '20250115',
    };
    localStorage.setItem('sl_attribution', JSON.stringify(attribution));

    const result = getAttribution();
    expect(result?.entryType).toBe('solo');
    expect(result?.dateKey).toBe('20250115');
  });

  it('returns null for corrupted JSON', () => {
    localStorage.setItem('sl_attribution', '{invalid}');
    expect(getAttribution()).toBeNull();
  });

  it('includes referrerId when present', () => {
    const attribution: Attribution = {
      entryType: 'chemistry',
      referrerId: 'referrer123',
      dateKey: '20250115',
    };
    localStorage.setItem('sl_attribution', JSON.stringify(attribution));

    const result = getAttribution();
    expect(result?.referrerId).toBe('referrer123');
  });

  it('includes variant when present', () => {
    const attribution: Attribution = {
      entryType: 'solo',
      variant: 'A',
      dateKey: '20250115',
    };
    localStorage.setItem('sl_attribution', JSON.stringify(attribution));

    const result = getAttribution();
    expect(result?.variant).toBe('A');
  });
});

describe('setAttribution', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores attribution', () => {
    const attribution: Attribution = {
      entryType: 'solo',
      dateKey: '20250115',
    };
    setAttribution(attribution);

    const stored = JSON.parse(localStorage.getItem('sl_attribution')!);
    expect(stored.entryType).toBe('solo');
  });

  it('stores all fields', () => {
    const attribution: Attribution = {
      entryType: 'chemistry',
      referrerId: 'ref123',
      variant: 'B',
      dateKey: '20250115',
    };
    setAttribution(attribution);

    const stored = JSON.parse(localStorage.getItem('sl_attribution')!);
    expect(stored.entryType).toBe('chemistry');
    expect(stored.referrerId).toBe('ref123');
    expect(stored.variant).toBe('B');
    expect(stored.dateKey).toBe('20250115');
  });

  it('overwrites existing attribution', () => {
    setAttribution({ entryType: 'solo', dateKey: '20250114' });
    setAttribution({ entryType: 'chemistry', dateKey: '20250115' });

    const stored = JSON.parse(localStorage.getItem('sl_attribution')!);
    expect(stored.entryType).toBe('chemistry');
    expect(stored.dateKey).toBe('20250115');
  });
});

describe('captureAttributionFromUrl', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('captures solo entry type from type param', () => {
    captureAttributionFromUrl('?type=solo', '/result');

    const attr = getAttribution();
    expect(attr?.entryType).toBe('solo');
  });

  it('captures chemistry entry type from type param', () => {
    captureAttributionFromUrl('?type=chemistry', '/result');

    const attr = getAttribution();
    expect(attr?.entryType).toBe('chemistry');
  });

  it('captures chemistry entry type from pathname', () => {
    captureAttributionFromUrl('', '/chemistry');

    const attr = getAttribution();
    expect(attr?.entryType).toBe('chemistry');
  });

  it('captures chemistry from pathname even without type param', () => {
    captureAttributionFromUrl('?foo=bar', '/chemistry/partner');

    const attr = getAttribution();
    expect(attr?.entryType).toBe('chemistry');
  });

  it('defaults to unknown when no type specified', () => {
    captureAttributionFromUrl('', '/result');

    const attr = getAttribution();
    expect(attr?.entryType).toBe('unknown');
  });

  it('captures referrer_id from URL', () => {
    captureAttributionFromUrl('?referrer_id=user123', '/result');

    const attr = getAttribution();
    expect(attr?.referrerId).toBe('user123');
  });

  it('captures from param as referrer fallback', () => {
    captureAttributionFromUrl('?from=user456', '/result');

    const attr = getAttribution();
    expect(attr?.referrerId).toBe('user456');
  });

  it('prefers referrer_id over from', () => {
    captureAttributionFromUrl('?referrer_id=primary&from=fallback', '/result');

    const attr = getAttribution();
    expect(attr?.referrerId).toBe('primary');
  });

  it('captures variant from v param', () => {
    captureAttributionFromUrl('?v=A', '/result');

    const attr = getAttribution();
    expect(attr?.variant).toBe('A');
  });

  it('captures all params together', () => {
    captureAttributionFromUrl('?type=solo&referrer_id=ref123&v=B', '/result');

    const attr = getAttribution();
    expect(attr?.entryType).toBe('solo');
    expect(attr?.referrerId).toBe('ref123');
    expect(attr?.variant).toBe('B');
  });

  it('sets dateKey from todayKey', () => {
    captureAttributionFromUrl('', '/result');

    const attr = getAttribution();
    expect(attr?.dateKey).toBe('20250115');
  });

  it('referrerId is undefined when not provided', () => {
    captureAttributionFromUrl('?type=solo', '/result');

    const attr = getAttribution();
    expect(attr?.referrerId).toBeUndefined();
  });

  it('variant is undefined when not provided', () => {
    captureAttributionFromUrl('?type=solo', '/result');

    const attr = getAttribution();
    expect(attr?.variant).toBeUndefined();
  });
});
