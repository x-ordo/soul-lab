import { z } from 'zod';

const ThemeSchema = z.enum([
  'career',
  'love',
  'money',
  'health',
  'relationship',
  'general',
]);

const ThemeWeightSchema = z.object({
  name: ThemeSchema,
  base_weight: z.number().positive(),
  display_name_ko: z.string().min(1),
  priority: z.number().min(1).max(10),
});

const DateModifierPeriodSchema = z
  .object({
    start: z.string().regex(/^\d{2}-\d{2}$/).optional(),
    end: z.string().regex(/^\d{2}-\d{2}$/).optional(),
    month: z.number().min(1).max(12).optional(),
    day: z.number().min(1).max(31).optional(),
  })
  .refine(
    (p) => (p.start && p.end) || (p.month !== undefined) || (p.day !== undefined),
    'Must have date range (start/end) or specific month/day'
  );

const DateModifierSchema = z.object({
  period: DateModifierPeriodSchema,
  theme: ThemeSchema,
  multiplier: z.number().positive(),
  reason: z.string().optional(),
});

const FallbackSchema = z.object({
  theme: ThemeSchema,
  copy_pool: z.string().min(1),
});

export const WeightsConfigSchema = z.object({
  version: z.number().int().positive(),
  themes: z.array(ThemeWeightSchema),
  date_modifiers: z.array(DateModifierSchema),
  fallback: FallbackSchema,
});

export type WeightsConfigSchemaType = z.infer<typeof WeightsConfigSchema>;
