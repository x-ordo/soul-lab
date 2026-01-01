/**
 * A/B Testing Framework
 *
 * Simple client-side A/B testing with:
 * - Deterministic assignment (same user always gets same variant)
 * - Analytics integration
 * - Feature flag support
 */

import { hash32 } from '../utils/engine';
import { getEffectiveUserKey } from './storage';
import { track } from './analytics';

// ============================================
// Types
// ============================================

export interface Experiment {
  id: string;
  name: string;
  variants: string[];
  weights?: number[]; // Optional weights (defaults to equal)
  active: boolean;
}

export interface ExperimentAssignment {
  experimentId: string;
  variant: string;
  variantIndex: number;
}

// ============================================
// Experiment Registry
// ============================================

/**
 * All active experiments.
 * Add new experiments here.
 */
export const EXPERIMENTS: Record<string, Experiment> = {
  // Cold Reading effectiveness test
  cold_reading_style: {
    id: 'cold_reading_style',
    name: 'Cold Reading Style',
    variants: ['control', 'rainbow_ruse', 'barnum_heavy'],
    active: true,
  },

  // Ad delay test (2 vs 3 days)
  ad_delay_days: {
    id: 'ad_delay_days',
    name: 'Ad Delay Days',
    variants: ['2_days', '3_days', '5_days'],
    active: true,
  },

  // Chemistry partial reveal test
  chemistry_partial: {
    id: 'chemistry_partial',
    name: 'Chemistry Partial Reveal',
    variants: ['score_only', 'score_and_label', 'blurred_message'],
    active: true,
  },

  // Share CTA copy test
  share_cta_copy: {
    id: 'share_cta_copy',
    name: 'Share CTA Copy',
    variants: ['neutral', 'curiosity', 'urgency'],
    active: true,
  },
};

// ============================================
// Assignment Logic
// ============================================

const ASSIGNMENT_CACHE: Map<string, ExperimentAssignment> = new Map();

/**
 * Get variant assignment for a user.
 * Uses deterministic hashing for consistent assignment.
 */
export function getVariant(experimentId: string, userKey?: string): ExperimentAssignment | null {
  const experiment = EXPERIMENTS[experimentId];
  if (!experiment || !experiment.active) {
    return null;
  }

  const effectiveUserKey = userKey || getEffectiveUserKey();
  const cacheKey = `${experimentId}:${effectiveUserKey}`;

  // Check cache first
  const cached = ASSIGNMENT_CACHE.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Calculate variant using deterministic hash
  const h = hash32(`${experimentId}|${effectiveUserKey}|ab_v1`);
  const { variants, weights } = experiment;

  let variantIndex: number;

  if (weights && weights.length === variants.length) {
    // Weighted assignment
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const rand = h % totalWeight;
    let cumulative = 0;
    variantIndex = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) {
        variantIndex = i;
        break;
      }
    }
  } else {
    // Equal distribution
    variantIndex = h % variants.length;
  }

  const assignment: ExperimentAssignment = {
    experimentId,
    variant: variants[variantIndex],
    variantIndex,
  };

  // Cache and track
  ASSIGNMENT_CACHE.set(cacheKey, assignment);
  track('ab_assignment', {
    experiment_id: experimentId,
    variant: assignment.variant,
    variant_index: variantIndex,
  });

  return assignment;
}

/**
 * Check if user is in a specific variant.
 */
export function isInVariant(experimentId: string, variant: string, userKey?: string): boolean {
  const assignment = getVariant(experimentId, userKey);
  return assignment?.variant === variant;
}

/**
 * Get all active experiment assignments for current user.
 */
export function getAllAssignments(userKey?: string): ExperimentAssignment[] {
  return Object.keys(EXPERIMENTS)
    .map((id) => getVariant(id, userKey))
    .filter((a): a is ExperimentAssignment => a !== null);
}

// ============================================
// Hooks
// ============================================

/**
 * Track experiment exposure (when user actually sees the variant).
 * Call this when the feature is rendered.
 */
export function trackExposure(experimentId: string, context?: Record<string, unknown>): void {
  const assignment = getVariant(experimentId);
  if (!assignment) return;

  track('ab_exposure', {
    experiment_id: experimentId,
    variant: assignment.variant,
    ...context,
  });
}

/**
 * Track conversion for an experiment.
 * Call this when user completes the desired action.
 */
export function trackConversion(
  experimentId: string,
  conversionType: string,
  value?: number
): void {
  const assignment = getVariant(experimentId);
  if (!assignment) return;

  track('ab_conversion', {
    experiment_id: experimentId,
    variant: assignment.variant,
    conversion_type: conversionType,
    value,
  });
}

// ============================================
// React Hook
// ============================================

import { useMemo } from 'react';

/**
 * React hook for A/B testing.
 *
 * @example
 * const { variant, trackExposure, trackConversion } = useExperiment('share_cta_copy');
 * if (variant === 'curiosity') {
 *   return <Button>궁금하지 않아요? 👀</Button>;
 * }
 */
export function useExperiment(experimentId: string) {
  const assignment = useMemo(() => getVariant(experimentId), [experimentId]);

  return {
    variant: assignment?.variant ?? null,
    variantIndex: assignment?.variantIndex ?? -1,
    isActive: assignment !== null,
    trackExposure: (context?: Record<string, unknown>) => trackExposure(experimentId, context),
    trackConversion: (type: string, value?: number) => trackConversion(experimentId, type, value),
  };
}
