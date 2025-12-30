import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getVariant, setVariant, Variant } from './variant';

// Mock dependencies
vi.mock('./seed', () => ({
  hash32: vi.fn((input: string) => {
    // Simple mock hash that returns different values for different inputs
    let h = 0;
    for (let i = 0; i < input.length; i++) {
      h = ((h << 5) - h + input.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }),
}));

vi.mock('./attribution', () => ({
  getAttribution: vi.fn(() => null),
}));

import { hash32 } from './seed';
import { getAttribution } from './attribution';

describe('getVariant', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('returns A or B', () => {
    const variant = getVariant('user1');
    expect(['A', 'B']).toContain(variant);
  });

  it('is deterministic for same user', () => {
    const v1 = getVariant('user1');
    const v2 = getVariant('user1');
    expect(v1).toBe(v2);
  });

  it('uses URL attribution override when available', () => {
    vi.mocked(getAttribution).mockReturnValue({
      entryType: 'solo',
      variant: 'A',
      dateKey: '20250115',
    });

    const variant = getVariant('user1');
    expect(variant).toBe('A');
  });

  it('uses URL attribution B variant', () => {
    vi.mocked(getAttribution).mockReturnValue({
      entryType: 'solo',
      variant: 'B',
      dateKey: '20250115',
    });

    const variant = getVariant('user1');
    expect(variant).toBe('B');
  });

  it('ignores invalid attribution variant', () => {
    vi.mocked(getAttribution).mockReturnValue({
      entryType: 'solo',
      variant: 'C', // invalid
      dateKey: '20250115',
    });

    const variant = getVariant('user1');
    expect(['A', 'B']).toContain(variant);
  });

  it('uses stored variant when available', () => {
    localStorage.setItem('sl_variant', 'B');
    vi.mocked(getAttribution).mockReturnValue(null);

    const variant = getVariant('user1');
    expect(variant).toBe('B');
  });

  it('calculates variant from hash when nothing stored', () => {
    vi.mocked(getAttribution).mockReturnValue(null);

    // Should call hash32 and store result
    const variant = getVariant('user1');
    expect(hash32).toHaveBeenCalledWith('user1');
    expect(localStorage.getItem('sl_variant')).toBe(variant);
  });

  it('returns A when hash is even', () => {
    vi.mocked(getAttribution).mockReturnValue(null);
    vi.mocked(hash32).mockReturnValue(100); // even

    const variant = getVariant('userEven');
    expect(variant).toBe('A');
  });

  it('returns B when hash is odd', () => {
    vi.mocked(getAttribution).mockReturnValue(null);
    vi.mocked(hash32).mockReturnValue(101); // odd

    const variant = getVariant('userOdd');
    expect(variant).toBe('B');
  });

  it('stores calculated variant', () => {
    vi.mocked(getAttribution).mockReturnValue(null);

    getVariant('user1');
    expect(localStorage.getItem('sl_variant')).toBeTruthy();
  });

  it('different users may get different variants', () => {
    vi.mocked(getAttribution).mockReturnValue(null);

    const variants = new Set<Variant>();
    for (let i = 0; i < 100; i++) {
      localStorage.clear();
      vi.mocked(hash32).mockReturnValue(i);
      variants.add(getVariant(`user${i}`));
    }

    expect(variants.size).toBe(2); // Both A and B
  });
});

describe('setVariant', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores variant A', () => {
    setVariant('A');
    expect(localStorage.getItem('sl_variant')).toBe('A');
  });

  it('stores variant B', () => {
    setVariant('B');
    expect(localStorage.getItem('sl_variant')).toBe('B');
  });

  it('overrides existing variant', () => {
    setVariant('A');
    setVariant('B');
    expect(localStorage.getItem('sl_variant')).toBe('B');
  });
});
