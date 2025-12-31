import { Theme, WeightsConfig, CopyTemplate, EvaluationContext, THEME_LIST } from './types.js';

/**
 * Select winning theme based on scores (deterministic tie-break)
 */
export function selectTheme(
  scores: Record<Theme, number>,
  weights: WeightsConfig,
  seed: number
): Theme {
  const maxScore = Math.max(...Object.values(scores));

  // If all scores are 0, use fallback theme
  if (maxScore === 0) {
    return weights.fallback.theme;
  }

  // Find all themes with max score
  const winners = THEME_LIST.filter((theme) => scores[theme] === maxScore);

  if (winners.length === 1) {
    return winners[0];
  }

  // Deterministic tie-break: sort by priority from weights config
  const sortedByPriority = winners.sort((a, b) => {
    const aPriority = weights.themes.find((t) => t.name === a)?.priority ?? 999;
    const bPriority = weights.themes.find((t) => t.name === b)?.priority ?? 999;
    return aPriority - bPriority;
  });

  // Secondary tie-break using seed for additional randomness
  const idx = seed % sortedByPriority.length;
  return sortedByPriority[idx];
}

/**
 * Select copy template based on context (deterministic)
 */
export function selectCopy(
  copies: CopyTemplate[],
  context: EvaluationContext,
  seed: number
): CopyTemplate {
  if (copies.length === 0) {
    throw new Error('No copy templates available');
  }

  // Filter by zodiac group and season
  let candidates = copies.filter((c) => {
    // Check zodiac group if specified
    if (c.zodiac_group && c.zodiac_group.length > 0) {
      if (!c.zodiac_group.includes(context.zodiac)) {
        return false;
      }
    }

    // Check season if specified
    if (c.season && c.season !== context.season) {
      return false;
    }

    return true;
  });

  // Fallback to all copies if no match
  if (candidates.length === 0) {
    candidates = copies;
  }

  // Sort by ID for determinism, then select using seed
  candidates.sort((a, b) => a.id.localeCompare(b.id));
  const idx = seed % candidates.length;
  return candidates[idx];
}
