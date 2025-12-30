import { describe, it, expect } from 'vitest';
import { getStreakLevel, getStreakReward, StreakLevel } from './streakBonus';

describe('getStreakLevel', () => {
  it('returns level 0 for streak < 7', () => {
    expect(getStreakLevel(0).level).toBe(0);
    expect(getStreakLevel(1).level).toBe(0);
    expect(getStreakLevel(6).level).toBe(0);
  });

  it('returns level 1 for streak 7-13', () => {
    expect(getStreakLevel(7).level).toBe(1);
    expect(getStreakLevel(10).level).toBe(1);
    expect(getStreakLevel(13).level).toBe(1);
  });

  it('returns level 2 for streak 14-20', () => {
    expect(getStreakLevel(14).level).toBe(2);
    expect(getStreakLevel(17).level).toBe(2);
    expect(getStreakLevel(20).level).toBe(2);
  });

  it('returns level 3 for streak 21-29', () => {
    expect(getStreakLevel(21).level).toBe(3);
    expect(getStreakLevel(25).level).toBe(3);
    expect(getStreakLevel(29).level).toBe(3);
  });

  it('returns level 4 for streak >= 30', () => {
    expect(getStreakLevel(30).level).toBe(4);
    expect(getStreakLevel(50).level).toBe(4);
    expect(getStreakLevel(100).level).toBe(4);
  });

  it('returns correct name for each level', () => {
    expect(getStreakLevel(0).name).toBe('첫 발걸음');
    expect(getStreakLevel(7).name).toBe('운세 탐험가');
    expect(getStreakLevel(14).name).toBe('기운 수집가');
    expect(getStreakLevel(21).name).toBe('별의 인도자');
    expect(getStreakLevel(30).name).toBe('운명의 수호자');
  });

  it('returns correct icon for each level', () => {
    expect(getStreakLevel(0).icon).toBe('🌙');
    expect(getStreakLevel(7).icon).toBe('🔮');
    expect(getStreakLevel(14).icon).toBe('✨');
    expect(getStreakLevel(21).icon).toBe('🌟');
    expect(getStreakLevel(30).icon).toBe('💎');
  });

  it('returns correct color for each level', () => {
    expect(getStreakLevel(0).color).toBe('#9370db');
    expect(getStreakLevel(7).color).toBe('#cd7f32');
    expect(getStreakLevel(14).color).toBe('#c0c0c0');
    expect(getStreakLevel(21).color).toBe('#ffd700');
    expect(getStreakLevel(30).color).toBe('#e040fb');
  });

  it('returns complete StreakLevel object', () => {
    const level = getStreakLevel(14);
    expect(level).toHaveProperty('level');
    expect(level).toHaveProperty('name');
    expect(level).toHaveProperty('icon');
    expect(level).toHaveProperty('color');
  });
});

describe('getStreakReward', () => {
  it('returns null for non-milestone days', () => {
    expect(getStreakReward(1)).toBeNull();
    expect(getStreakReward(5)).toBeNull();
    expect(getStreakReward(10)).toBeNull();
    expect(getStreakReward(20)).toBeNull();
    expect(getStreakReward(25)).toBeNull();
    expect(getStreakReward(31)).toBeNull();
  });

  it('returns reward message for 7-day milestone', () => {
    const reward = getStreakReward(7);
    expect(reward).not.toBeNull();
    expect(reward).toContain('7일');
    expect(reward).toContain('🎁');
  });

  it('returns reward message for 14-day milestone', () => {
    const reward = getStreakReward(14);
    expect(reward).not.toBeNull();
    expect(reward).toContain('14일');
    expect(reward).toContain('🎁');
  });

  it('returns reward message for 21-day milestone', () => {
    const reward = getStreakReward(21);
    expect(reward).not.toBeNull();
    expect(reward).toContain('21일');
    expect(reward).toContain('별의 인도자');
  });

  it('returns reward message for 30-day milestone', () => {
    const reward = getStreakReward(30);
    expect(reward).not.toBeNull();
    expect(reward).toContain('30일');
    expect(reward).toContain('운명의 수호자');
  });

  it('only returns reward at exact milestone', () => {
    expect(getStreakReward(6)).toBeNull();
    expect(getStreakReward(7)).not.toBeNull();
    expect(getStreakReward(8)).toBeNull();
  });
});
