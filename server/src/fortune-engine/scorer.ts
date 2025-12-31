import { Rule, Theme, WeightsConfig, EvaluationContext, THEME_LIST } from './types.js';
import { getMonthDay } from './utils.js';

/**
 * Check if date modifier period matches
 */
function matchesDateModifier(
  period: { start?: string; end?: string; month?: number; day?: number },
  date: Date
): boolean {
  const monthDay = getMonthDay(date);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Specific month check
  if (period.month !== undefined && period.month !== month) {
    return false;
  }

  // Specific day check
  if (period.day !== undefined && period.day !== day) {
    return false;
  }

  // Date range check
  if (period.start && period.end) {
    if (period.start > period.end) {
      // Wrap-around (e.g., 12-20 to 01-10)
      if (!(monthDay >= period.start || monthDay <= period.end)) {
        return false;
      }
    } else {
      if (!(monthDay >= period.start && monthDay <= period.end)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Aggregate scores from matched rules
 */
export function aggregateScores(
  matchedRules: Rule[],
  context: EvaluationContext,
  weights: WeightsConfig
): Record<Theme, number> {
  // Initialize all themes with 0
  const scores: Record<Theme, number> = {} as Record<Theme, number>;
  for (const theme of THEME_LIST) {
    scores[theme] = 0;
  }

  // Sum scores from matched rules
  for (const rule of matchedRules) {
    for (const [theme, points] of Object.entries(rule.effects.themes)) {
      scores[theme as Theme] += points;
    }
  }

  // Apply date-based modifiers
  for (const modifier of weights.date_modifiers) {
    if (matchesDateModifier(modifier.period, context.targetDate)) {
      scores[modifier.theme] *= modifier.multiplier;
    }
  }

  // Apply base weights from config
  for (const themeConfig of weights.themes) {
    scores[themeConfig.name] *= themeConfig.base_weight;
  }

  return scores;
}
