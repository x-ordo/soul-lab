import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeTodayReport, makeDetailReport, makeChemistryReport } from './report';

// Mock dependencies
vi.mock('./seed', () => ({
  todayKey: vi.fn(() => '20250115'),
}));

vi.mock('./storage', () => ({
  getBirthDate: vi.fn(() => '19950315'),
}));

describe('makeTodayReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object with all required fields', () => {
    const report = makeTodayReport('user123');

    expect(report).toHaveProperty('templateId');
    expect(report).toHaveProperty('subtitle');
    expect(report).toHaveProperty('score');
    expect(report).toHaveProperty('rankText');
    expect(report).toHaveProperty('oneLiner');
    expect(report).toHaveProperty('luckyTime');
    expect(report).toHaveProperty('helper');
    expect(report).toHaveProperty('caution');
  });

  it('returns valid score within range [60, 100]', () => {
    const report = makeTodayReport('user123');
    expect(report.score).toBeGreaterThanOrEqual(60);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('is deterministic - same user returns same report', () => {
    const report1 = makeTodayReport('user123');
    const report2 = makeTodayReport('user123');

    expect(report1.templateId).toBe(report2.templateId);
    expect(report1.score).toBe(report2.score);
    expect(report1.oneLiner).toBe(report2.oneLiner);
  });

  it('returns different reports for different users', () => {
    const reports = new Set<string>();
    for (let i = 0; i < 50; i++) {
      reports.add(makeTodayReport(`user${i}`).templateId);
    }
    // Should have variety
    expect(reports.size).toBeGreaterThan(1);
  });

  it('returns valid rankText based on score', () => {
    const report = makeTodayReport('user123');
    const validRankTexts = [
      '✨ 축복받은 운명 (상위 1%)',
      '🌟 빛나는 기운 (상위 3%)',
      '💫 강한 흐름 (상위 7%)',
      '🌙 안정된 기운 (상위 15%)',
      '☁️ 잠재된 기운 (상위 30%)',
    ];
    expect(validRankTexts).toContain(report.rankText);
  });

  it('templateId is a non-empty string', () => {
    const report = makeTodayReport('user123');
    expect(typeof report.templateId).toBe('string');
    expect(report.templateId.length).toBeGreaterThan(0);
  });

  it('oneLiner is a non-empty string', () => {
    const report = makeTodayReport('user123');
    expect(typeof report.oneLiner).toBe('string');
    expect(report.oneLiner.length).toBeGreaterThan(0);
  });

  it('locked fields are non-empty strings', () => {
    const report = makeTodayReport('user123');
    expect(typeof report.luckyTime).toBe('string');
    expect(report.luckyTime.length).toBeGreaterThan(0);
    expect(typeof report.helper).toBe('string');
    expect(report.helper.length).toBeGreaterThan(0);
    expect(typeof report.caution).toBe('string');
    expect(report.caution.length).toBeGreaterThan(0);
  });
});

describe('makeDetailReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object with all required fields', () => {
    const report = makeDetailReport('user123');

    expect(report).toHaveProperty('templateId');
    expect(report).toHaveProperty('subtitle');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('money');
    expect(report).toHaveProperty('love');
    expect(report).toHaveProperty('condition');
  });

  it('subtitle contains score', () => {
    const report = makeDetailReport('user123');
    expect(report.subtitle).toMatch(/\d+점/);
  });

  it('is deterministic - same user returns same report', () => {
    const report1 = makeDetailReport('user123');
    const report2 = makeDetailReport('user123');

    expect(report1.templateId).toBe(report2.templateId);
    expect(report1.subtitle).toBe(report2.subtitle);
    expect(report1.summary).toBe(report2.summary);
  });

  it('all detail fields are non-empty strings', () => {
    const report = makeDetailReport('user123');
    expect(typeof report.money).toBe('string');
    expect(report.money.length).toBeGreaterThan(0);
    expect(typeof report.love).toBe('string');
    expect(report.love.length).toBeGreaterThan(0);
    expect(typeof report.condition).toBe('string');
    expect(report.condition.length).toBeGreaterThan(0);
  });

  it('uses same templateId as makeTodayReport for same user', () => {
    const todayReport = makeTodayReport('user123');
    const detailReport = makeDetailReport('user123');
    expect(detailReport.templateId).toBe(todayReport.templateId);
  });
});

describe('makeChemistryReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an object with all required fields', () => {
    const report = makeChemistryReport('userA', 'userB');

    expect(report).toHaveProperty('score');
    expect(report).toHaveProperty('label');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('friction');
    expect(report).toHaveProperty('booster');
  });

  it('returns valid score within range [50, 100]', () => {
    const report = makeChemistryReport('userA', 'userB');
    expect(report.score).toBeGreaterThanOrEqual(50);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('is symmetric - order of users does not matter', () => {
    const report1 = makeChemistryReport('userA', 'userB');
    const report2 = makeChemistryReport('userB', 'userA');

    expect(report1.score).toBe(report2.score);
    expect(report1.label).toBe(report2.label);
    expect(report1.summary).toBe(report2.summary);
  });

  it('is deterministic - same pair returns same report', () => {
    const report1 = makeChemistryReport('userA', 'userB');
    const report2 = makeChemistryReport('userA', 'userB');

    expect(report1.score).toBe(report2.score);
    expect(report1.label).toBe(report2.label);
  });

  it('label is one of five predefined options', () => {
    const report = makeChemistryReport('userA', 'userB');
    const validLabels = [
      '🔥 운명적 불꽃',
      '💫 강렬한 인연',
      '🌙 안정된 조화',
      '🌀 미묘한 기류',
      '⚡ 도전적 관계',
    ];
    expect(validLabels).toContain(report.label);
  });

  it('returns different labels for different pairs', () => {
    const labels = new Set<string>();
    for (let i = 0; i < 100; i++) {
      labels.add(makeChemistryReport(`userA${i}`, `userB${i}`).label);
    }
    // Should have variety
    expect(labels.size).toBeGreaterThan(1);
  });

  it('summary reflects score tier correctly for high score', () => {
    // We need to find a pair with high score
    let highScoreReport = null;
    for (let i = 0; i < 1000; i++) {
      const report = makeChemistryReport(`userH${i}`, `userI${i}`);
      if (report.score >= 85) {
        highScoreReport = report;
        break;
      }
    }
    if (highScoreReport) {
      expect(highScoreReport.summary).toContain('두 영혼이 서로를 완성');
    }
  });

  it('summary reflects score tier correctly for medium score', () => {
    let mediumScoreReport = null;
    for (let i = 0; i < 1000; i++) {
      const report = makeChemistryReport(`userM${i}`, `userN${i}`);
      if (report.score >= 70 && report.score < 85) {
        mediumScoreReport = report;
        break;
      }
    }
    if (mediumScoreReport) {
      expect(mediumScoreReport.summary).toContain('에너지가 부딪히며');
    }
  });

  it('summary reflects score tier correctly for low score', () => {
    let lowScoreReport = null;
    for (let i = 0; i < 1000; i++) {
      const report = makeChemistryReport(`userL${i}`, `userO${i}`);
      if (report.score < 70) {
        lowScoreReport = report;
        break;
      }
    }
    if (lowScoreReport) {
      expect(lowScoreReport.summary).toContain('각자의 빛이 강한');
    }
  });

  it('all text fields are non-empty strings', () => {
    const report = makeChemistryReport('userA', 'userB');
    expect(typeof report.label).toBe('string');
    expect(report.label.length).toBeGreaterThan(0);
    expect(typeof report.summary).toBe('string');
    expect(report.summary.length).toBeGreaterThan(0);
    expect(typeof report.friction).toBe('string');
    expect(report.friction.length).toBeGreaterThan(0);
    expect(typeof report.booster).toBe('string');
    expect(report.booster.length).toBeGreaterThan(0);
  });
});
