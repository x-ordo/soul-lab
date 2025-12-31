import {
  UserProfile,
  FortuneResult,
  EvaluationContext,
  Theme,
  CopyTemplate,
} from './types.js';
import { getFortuneData, LoadedData } from './loader.js';
import { evaluateRules } from './evaluator.js';
import { aggregateScores } from './scorer.js';
import { selectTheme, selectCopy } from './selector.js';
import {
  hash32,
  calculateScore,
  scoreToRankText,
  getZodiacFromBirthDate,
  getSeasonFromDate,
  getMonthDay,
  formatDate,
  renderTemplate,
  getZodiacKorean,
  getTomorrowHint,
} from './utils.js';

export class FortuneEngine {
  private data: LoadedData;

  constructor(dataDir: string) {
    this.data = getFortuneData(dataDir);
  }

  /**
   * Generate fortune for a user profile
   */
  generateFortune(profile: UserProfile, targetDate: Date = new Date()): FortuneResult {
    // 1. Derive evaluation context from profile
    const context = this.deriveContext(profile, targetDate);

    // 2. Compute deterministic seed
    const seed = this.computeSeed(profile, targetDate);

    // 3. Evaluate all rules
    const matchedRules = evaluateRules(this.data.rules, context);

    // 4. Aggregate theme scores
    const scores = aggregateScores(matchedRules, context, this.data.weights);

    // 5. Select winning theme (deterministic)
    const theme = selectTheme(scores, this.data.weights, seed);

    // 6. Get copies for the selected theme
    const copies = this.data.copyByTheme.get(theme) || this.data.copyByTheme.get('general') || [];

    if (copies.length === 0) {
      throw new Error(`No copy templates available for theme: ${theme}`);
    }

    // 7. Select copy template (deterministic)
    const copy = selectCopy(copies, context, seed);

    // 8. Calculate score
    const score = calculateScore(
      profile.user_id,
      profile.birth_date,
      formatDate(targetDate)
    );

    // 9. Render copy with variables
    const rendered = this.renderCopy(copy, profile, context);

    return {
      date: formatDate(targetDate),
      theme,
      score,
      rank_text: scoreToRankText(score),
      result: {
        id: copy.id,
        one_liner: rendered.one_liner || '',
        summary: rendered.summary || '',
        details: {
          lucky_time: rendered.lucky_time,
          advice: rendered.advice,
          helper: rendered.helper,
          caution: rendered.caution,
          money_detail: rendered.money_detail,
          love_detail: rendered.love_detail,
          condition_detail: rendered.condition_detail,
        },
      },
      explain: {
        matched_rules: matchedRules.map((r) => r.id),
        scores: scores as Record<Theme, number>,
        selected_copy_id: copy.id,
        determinism_seed: seed,
      },
    };
  }

  /**
   * Derive evaluation context from user profile
   */
  private deriveContext(profile: UserProfile, targetDate: Date): EvaluationContext {
    const zodiac = getZodiacFromBirthDate(profile.birth_date);
    const season = getSeasonFromDate(targetDate);
    const dayOfWeek = targetDate.getDay();
    const monthDay = getMonthDay(targetDate);
    const questionTags = profile.question_tags || [];

    return {
      user: profile,
      targetDate,
      zodiac,
      season,
      dayOfWeek,
      monthDay,
      questionTags,
    };
  }

  /**
   * Compute deterministic seed for reproducibility
   */
  private computeSeed(profile: UserProfile, targetDate: Date): number {
    const key = `${profile.user_id}|${profile.birth_date}|${formatDate(targetDate)}`;
    return hash32(key);
  }

  /**
   * Render copy template with variable substitution
   */
  private renderCopy(
    copy: CopyTemplate,
    profile: UserProfile,
    context: EvaluationContext
  ): Record<string, string | undefined> {
    const variables: Record<string, string | number | undefined> = {
      name: profile.name,
      zodiac: context.zodiac,
      zodiac_korean: getZodiacKorean(context.zodiac),
      season: context.season,
      month: context.targetDate.getMonth() + 1,
      day: context.targetDate.getDate(),
    };

    const templates = copy.templates;
    return {
      one_liner: renderTemplate(templates.one_liner, variables),
      summary: renderTemplate(templates.summary, variables),
      lucky_time: templates.lucky_time
        ? renderTemplate(templates.lucky_time, variables)
        : undefined,
      advice: templates.advice ? renderTemplate(templates.advice, variables) : undefined,
      helper: templates.helper ? renderTemplate(templates.helper, variables) : undefined,
      caution: templates.caution ? renderTemplate(templates.caution, variables) : undefined,
      money_detail: templates.money_detail
        ? renderTemplate(templates.money_detail, variables)
        : undefined,
      love_detail: templates.love_detail
        ? renderTemplate(templates.love_detail, variables)
        : undefined,
      condition_detail: templates.condition_detail
        ? renderTemplate(templates.condition_detail, variables)
        : undefined,
    };
  }

  /**
   * Get tomorrow's hint
   */
  getTomorrowHint(profile: UserProfile): string {
    return getTomorrowHint(profile.user_id, profile.birth_date);
  }

  /**
   * Get all rules (for debugging/admin)
   */
  getAllRules() {
    return this.data.rules;
  }

  /**
   * Get rule statistics
   */
  getRuleStats() {
    return {
      totalRules: this.data.rules.length,
      copyThemes: Array.from(this.data.copyByTheme.keys()),
      copyCount: Object.fromEntries(
        Array.from(this.data.copyByTheme.entries()).map(([k, v]) => [k, v.length])
      ),
    };
  }
}

// Singleton instance
let engineInstance: FortuneEngine | null = null;

export function getFortuneEngine(dataDir?: string): FortuneEngine {
  if (!engineInstance && dataDir) {
    engineInstance = new FortuneEngine(dataDir);
  }
  if (!engineInstance) {
    throw new Error('Fortune engine not initialized. Call with dataDir first.');
  }
  return engineInstance;
}

export function initFortuneEngine(dataDir: string): FortuneEngine {
  engineInstance = new FortuneEngine(dataDir);
  return engineInstance;
}
