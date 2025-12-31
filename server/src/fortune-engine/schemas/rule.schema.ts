import { z } from 'zod';

const ZodiacSchema = z.enum([
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
]);

const QuestionTagSchema = z.enum(['career', 'love', 'money', 'health', 'relationship']);

const DateRangeSchema = z.object({
  start: z.string().regex(/^\d{2}-\d{2}$/, 'Must be MM-DD format'),
  end: z.string().regex(/^\d{2}-\d{2}$/, 'Must be MM-DD format'),
});

const MonthRangeSchema = z.object({
  start: z.number().min(1).max(12),
  end: z.number().min(1).max(12),
});

const QuestionTagsConditionSchema = z.object({
  any_of: z.array(QuestionTagSchema).optional(),
  all_of: z.array(QuestionTagSchema).optional(),
});

const RuleConditionSchema = z.object({
  zodiac: z.object({ any_of: z.array(ZodiacSchema) }).optional(),
  date_range: DateRangeSchema.optional(),
  month_range: MonthRangeSchema.optional(),
  question_tags: QuestionTagsConditionSchema.optional(),
  day_of_week: z.array(z.number().min(0).max(6)).optional(),
});

const ThemeSchema = z.enum([
  'career',
  'love',
  'money',
  'health',
  'relationship',
  'general',
]);

const RuleEffectSchema = z.object({
  themes: z.record(ThemeSchema, z.number()),
});

export const RuleSchema = z.object({
  id: z.string().regex(/^R\d{3}$/, 'Must be format R001, R002, etc.'),
  name: z.string().min(1),
  conditions: RuleConditionSchema,
  effects: RuleEffectSchema,
  priority: z.number().min(0).max(1000),
});

export const RulesFileSchema = z.object({
  rules: z.array(RuleSchema),
});

export type RuleSchemaType = z.infer<typeof RuleSchema>;
export type RulesFileSchemaType = z.infer<typeof RulesFileSchema>;
