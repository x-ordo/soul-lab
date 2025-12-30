import { describe, it, expect, beforeEach } from 'vitest';
import {
  getReferralCount,
  incrementReferral,
  getReferralLevel,
  isLevelUp,
  getLevelUpMessage,
} from './referralLevel';

describe('getReferralCount', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns 0 when not set', () => {
    expect(getReferralCount()).toBe(0);
  });

  it('returns stored value', () => {
    localStorage.setItem('sl_referral_count', '5');
    expect(getReferralCount()).toBe(5);
  });

  it('returns NaN for invalid value (no validation in source)', () => {
    localStorage.setItem('sl_referral_count', 'invalid');
    expect(getReferralCount()).toBeNaN();
  });
});

describe('incrementReferral', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('increments from 0 to 1', () => {
    expect(incrementReferral()).toBe(1);
    expect(getReferralCount()).toBe(1);
  });

  it('increments existing count', () => {
    localStorage.setItem('sl_referral_count', '5');
    expect(incrementReferral()).toBe(6);
    expect(getReferralCount()).toBe(6);
  });

  it('increments multiple times', () => {
    expect(incrementReferral()).toBe(1);
    expect(incrementReferral()).toBe(2);
    expect(incrementReferral()).toBe(3);
  });
});

describe('getReferralLevel', () => {
  it('returns base level for count 0', () => {
    const level = getReferralLevel(0);
    expect(level.name).toBe('새로운 시작');
    expect(level.icon).toBe('🌱');
    expect(level.minCount).toBe(0);
  });

  it('returns level 1 for count 1-4', () => {
    expect(getReferralLevel(1).name).toBe('인연 탐색자');
    expect(getReferralLevel(2).name).toBe('인연 탐색자');
    expect(getReferralLevel(4).name).toBe('인연 탐색자');
  });

  it('returns level 2 for count 5-9', () => {
    expect(getReferralLevel(5).name).toBe('운명의 중개자');
    expect(getReferralLevel(7).name).toBe('운명의 중개자');
    expect(getReferralLevel(9).name).toBe('운명의 중개자');
  });

  it('returns level 3 for count >= 10', () => {
    expect(getReferralLevel(10).name).toBe('우주적 매칭메이커');
    expect(getReferralLevel(15).name).toBe('우주적 매칭메이커');
    expect(getReferralLevel(100).name).toBe('우주적 매칭메이커');
  });

  it('returns correct icons', () => {
    expect(getReferralLevel(0).icon).toBe('🌱');
    expect(getReferralLevel(1).icon).toBe('🔍');
    expect(getReferralLevel(5).icon).toBe('🔗');
    expect(getReferralLevel(10).icon).toBe('🌌');
  });

  it('returns correct minCount', () => {
    expect(getReferralLevel(0).minCount).toBe(0);
    expect(getReferralLevel(1).minCount).toBe(1);
    expect(getReferralLevel(5).minCount).toBe(5);
    expect(getReferralLevel(10).minCount).toBe(10);
  });

  it('returns complete ReferralLevel object', () => {
    const level = getReferralLevel(5);
    expect(level).toHaveProperty('name');
    expect(level).toHaveProperty('icon');
    expect(level).toHaveProperty('minCount');
  });
});

describe('isLevelUp', () => {
  it('returns true for milestone 1', () => {
    expect(isLevelUp(1)).toBe(true);
  });

  it('returns true for milestone 5', () => {
    expect(isLevelUp(5)).toBe(true);
  });

  it('returns true for milestone 10', () => {
    expect(isLevelUp(10)).toBe(true);
  });

  it('returns false for non-milestones', () => {
    expect(isLevelUp(0)).toBe(false);
    expect(isLevelUp(2)).toBe(false);
    expect(isLevelUp(3)).toBe(false);
    expect(isLevelUp(4)).toBe(false);
    expect(isLevelUp(6)).toBe(false);
    expect(isLevelUp(7)).toBe(false);
    expect(isLevelUp(11)).toBe(false);
    expect(isLevelUp(15)).toBe(false);
  });
});

describe('getLevelUpMessage', () => {
  it('returns null for non-milestones', () => {
    expect(getLevelUpMessage(0)).toBeNull();
    expect(getLevelUpMessage(2)).toBeNull();
    expect(getLevelUpMessage(6)).toBeNull();
    expect(getLevelUpMessage(11)).toBeNull();
  });

  it('returns message for milestone 1', () => {
    const message = getLevelUpMessage(1);
    expect(message).not.toBeNull();
    expect(message).toContain('🎉');
    expect(message).toContain('인연 탐색자');
    expect(message).toContain('🔍');
  });

  it('returns message for milestone 5', () => {
    const message = getLevelUpMessage(5);
    expect(message).not.toBeNull();
    expect(message).toContain('🎉');
    expect(message).toContain('운명의 중개자');
    expect(message).toContain('🔗');
  });

  it('returns message for milestone 10', () => {
    const message = getLevelUpMessage(10);
    expect(message).not.toBeNull();
    expect(message).toContain('🎉');
    expect(message).toContain('우주적 매칭메이커');
    expect(message).toContain('🌌');
  });

  it('message includes level icon and name', () => {
    const message = getLevelUpMessage(5);
    const level = getReferralLevel(5);
    expect(message).toContain(level.icon);
    expect(message).toContain(level.name);
  });
});
