import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getLocal,
  setLocal,
  getUserSeed,
  setUserSeed,
  getOrCreateUserSeed,
  getUnlockedDate,
  setUnlockedDate,
  getLastReportDate,
  setLastReportDate,
  getPublicKey,
  setPublicKey,
  getEffectiveUserKey,
  getBirthDate,
  setBirthDate,
  getAgreement,
  setAgreement,
  hasRequiredAgreement,
  getViralUnlockedDate,
  setViralUnlockedDate,
  hasThirdPartyConsent,
  hasBirthDate,
} from './storage';

describe('getLocal / setLocal', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null for non-existent key', () => {
    expect(getLocal('non_existent')).toBeNull();
  });

  it('stores and retrieves string', () => {
    setLocal('test_key', 'test_value');
    expect(getLocal<string>('test_key')).toBe('test_value');
  });

  it('stores and retrieves number', () => {
    setLocal('test_num', 42);
    expect(getLocal<number>('test_num')).toBe(42);
  });

  it('stores and retrieves object', () => {
    const obj = { foo: 'bar', num: 123 };
    setLocal('test_obj', obj);
    expect(getLocal<typeof obj>('test_obj')).toEqual(obj);
  });

  it('stores and retrieves array', () => {
    const arr = [1, 2, 3, 'four'];
    setLocal('test_arr', arr);
    expect(getLocal<typeof arr>('test_arr')).toEqual(arr);
  });

  it('returns null for corrupted JSON', () => {
    localStorage.setItem('corrupted', '{invalid json');
    expect(getLocal('corrupted')).toBeNull();
  });

  it('returns null for empty string', () => {
    localStorage.setItem('empty', '');
    expect(getLocal('empty')).toBeNull();
  });
});

describe('userSeed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getUserSeed returns null when not set', () => {
    expect(getUserSeed()).toBeNull();
  });

  it('setUserSeed stores and getUserSeed retrieves', () => {
    setUserSeed('my_seed_123');
    expect(getUserSeed()).toBe('my_seed_123');
  });

  it('getOrCreateUserSeed creates new seed when none exists', () => {
    const seed = getOrCreateUserSeed();
    expect(seed).toBeTruthy();
    expect(seed.startsWith('sl_')).toBe(true);
  });

  it('getOrCreateUserSeed returns existing seed', () => {
    setUserSeed('existing_seed');
    expect(getOrCreateUserSeed()).toBe('existing_seed');
  });

  it('getOrCreateUserSeed is idempotent', () => {
    const seed1 = getOrCreateUserSeed();
    const seed2 = getOrCreateUserSeed();
    expect(seed1).toBe(seed2);
  });

  it('created seed has reasonable length', () => {
    const seed = getOrCreateUserSeed();
    expect(seed.length).toBeGreaterThan(10);
    expect(seed.length).toBeLessThanOrEqual(48);
  });
});

describe('unlockedDate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getUnlockedDate returns null when not set', () => {
    expect(getUnlockedDate()).toBeNull();
  });

  it('setUnlockedDate stores and getUnlockedDate retrieves', () => {
    setUnlockedDate('20250115');
    expect(getUnlockedDate()).toBe('20250115');
  });
});

describe('lastReportDate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getLastReportDate returns null when not set', () => {
    expect(getLastReportDate()).toBeNull();
  });

  it('setLastReportDate stores and getLastReportDate retrieves', () => {
    setLastReportDate('20250115');
    expect(getLastReportDate()).toBe('20250115');
  });
});

describe('publicKey', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getPublicKey returns null when not set', () => {
    expect(getPublicKey()).toBeNull();
  });

  it('setPublicKey stores and getPublicKey retrieves', () => {
    setPublicKey('public_key_123');
    expect(getPublicKey()).toBe('public_key_123');
  });
});

describe('getEffectiveUserKey', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns publicKey when set and non-empty', () => {
    setPublicKey('public_key_abc');
    const key = getEffectiveUserKey();
    expect(key).toBe('public_key_abc');
  });

  it('returns userSeed when publicKey is not set', () => {
    setUserSeed('user_seed_xyz');
    const key = getEffectiveUserKey();
    expect(key).toBe('user_seed_xyz');
  });

  it('creates userSeed when neither is set', () => {
    const key = getEffectiveUserKey();
    expect(key).toBeTruthy();
    expect(key.startsWith('sl_')).toBe(true);
  });

  it('ignores empty publicKey', () => {
    setPublicKey('');
    setUserSeed('user_seed_123');
    expect(getEffectiveUserKey()).toBe('user_seed_123');
  });
});

describe('birthDate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getBirthDate returns null when not set', () => {
    expect(getBirthDate()).toBeNull();
  });

  it('setBirthDate stores and getBirthDate retrieves', () => {
    setBirthDate('19950315');
    expect(getBirthDate()).toBe('19950315');
  });
});

describe('hasBirthDate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when not set', () => {
    expect(hasBirthDate()).toBe(false);
  });

  it('returns true for valid 8-digit date', () => {
    setBirthDate('19950315');
    expect(hasBirthDate()).toBe(true);
  });

  it('returns false for invalid format', () => {
    setBirthDate('1995-03-15');
    expect(hasBirthDate()).toBe(false);
  });

  it('returns false for too short', () => {
    setBirthDate('1995031');
    expect(hasBirthDate()).toBe(false);
  });

  it('returns false for too long', () => {
    setBirthDate('199503150');
    expect(hasBirthDate()).toBe(false);
  });
});

describe('agreement', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getAgreement returns null when not set', () => {
    expect(getAgreement()).toBeNull();
  });

  it('setAgreement stores and getAgreement retrieves', () => {
    const agreement = { terms: true, thirdParty: false, marketing: true };
    setAgreement(agreement);
    const stored = getAgreement();
    expect(stored?.terms).toBe(true);
    expect(stored?.thirdParty).toBe(false);
    expect(stored?.marketing).toBe(true);
  });

  it('setAgreement adds timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T10:00:00Z'));

    setAgreement({ terms: true, thirdParty: true, marketing: false });
    const stored = getAgreement();
    expect(stored?.at).toBe(Date.now());

    vi.useRealTimers();
  });

  it('getAgreement returns null for corrupted JSON', () => {
    localStorage.setItem('sl_agreement_v1', '{invalid}');
    expect(getAgreement()).toBeNull();
  });
});

describe('hasRequiredAgreement', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when no agreement', () => {
    expect(hasRequiredAgreement()).toBe(false);
  });

  it('returns true when terms agreed', () => {
    setAgreement({ terms: true, thirdParty: false, marketing: false });
    expect(hasRequiredAgreement()).toBe(true);
  });

  it('returns false when terms not agreed', () => {
    setAgreement({ terms: false, thirdParty: true, marketing: true });
    expect(hasRequiredAgreement()).toBe(false);
  });
});

describe('hasThirdPartyConsent', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns false when no agreement', () => {
    expect(hasThirdPartyConsent()).toBe(false);
  });

  it('returns true when thirdParty agreed', () => {
    setAgreement({ terms: true, thirdParty: true, marketing: false });
    expect(hasThirdPartyConsent()).toBe(true);
  });

  it('returns false when thirdParty not agreed', () => {
    setAgreement({ terms: true, thirdParty: false, marketing: false });
    expect(hasThirdPartyConsent()).toBe(false);
  });
});

describe('viralUnlockedDate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('getViralUnlockedDate returns null when not set', () => {
    expect(getViralUnlockedDate()).toBeNull();
  });

  it('setViralUnlockedDate stores and getViralUnlockedDate retrieves', () => {
    setViralUnlockedDate('20250115');
    expect(getViralUnlockedDate()).toBe('20250115');
  });
});
