import { Rule, EvaluationContext, Zodiac, QuestionTag } from './types.js';

/**
 * Check if zodiac condition matches
 */
function matchZodiac(condition: { any_of: Zodiac[] }, zodiac: Zodiac): boolean {
  return condition.any_of.includes(zodiac);
}

/**
 * Check if date range condition matches (MM-DD format)
 */
function matchDateRange(
  condition: { start: string; end: string },
  monthDay: string
): boolean {
  const { start, end } = condition;

  // Handle year wrap-around (e.g., 12-20 to 01-10)
  if (start > end) {
    return monthDay >= start || monthDay <= end;
  }

  return monthDay >= start && monthDay <= end;
}

/**
 * Check if month range condition matches
 */
function matchMonthRange(condition: { start: number; end: number }, date: Date): boolean {
  const month = date.getMonth() + 1;
  const { start, end } = condition;

  // Handle year wrap-around (e.g., November to February)
  if (start > end) {
    return month >= start || month <= end;
  }

  return month >= start && month <= end;
}

/**
 * Check if question tags condition matches
 */
function matchQuestionTags(
  condition: { any_of?: QuestionTag[]; all_of?: QuestionTag[] },
  tags: QuestionTag[]
): boolean {
  if (condition.any_of && condition.any_of.length > 0) {
    const hasAny = condition.any_of.some((t) => tags.includes(t));
    if (!hasAny) return false;
  }

  if (condition.all_of && condition.all_of.length > 0) {
    const hasAll = condition.all_of.every((t) => tags.includes(t));
    if (!hasAll) return false;
  }

  return true;
}

/**
 * Check if day of week condition matches
 */
function matchDayOfWeek(condition: number[], dayOfWeek: number): boolean {
  return condition.includes(dayOfWeek);
}

/**
 * Evaluate a single rule against the context
 * Returns true if ALL conditions match (AND logic)
 */
export function evaluateRule(rule: Rule, context: EvaluationContext): boolean {
  const { conditions } = rule;

  // If no conditions, rule always matches
  if (Object.keys(conditions).length === 0) {
    return true;
  }

  // All conditions must match
  if (conditions.zodiac && !matchZodiac(conditions.zodiac, context.zodiac)) {
    return false;
  }

  if (conditions.date_range && !matchDateRange(conditions.date_range, context.monthDay)) {
    return false;
  }

  if (conditions.month_range && !matchMonthRange(conditions.month_range, context.targetDate)) {
    return false;
  }

  if (conditions.question_tags && !matchQuestionTags(conditions.question_tags, context.questionTags)) {
    return false;
  }

  if (conditions.day_of_week && !matchDayOfWeek(conditions.day_of_week, context.dayOfWeek)) {
    return false;
  }

  return true;
}

/**
 * Evaluate all rules and return matching ones
 */
export function evaluateRules(rules: Rule[], context: EvaluationContext): Rule[] {
  return rules.filter((rule) => evaluateRule(rule, context));
}
