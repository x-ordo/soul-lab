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

const SeasonSchema = z.enum(['spring', 'summer', 'autumn', 'winter']);

const ThemeSchema = z.enum([
  'career',
  'love',
  'money',
  'health',
  'relationship',
  'general',
]);

const CopyTemplatesSchema = z.object({
  one_liner: z.string().min(1),
  summary: z.string().min(1),
  lucky_time: z.string().optional(),
  advice: z.string().optional(),
  helper: z.string().optional(),
  caution: z.string().optional(),
  money_detail: z.string().optional(),
  love_detail: z.string().optional(),
  condition_detail: z.string().optional(),
});

const CopyMetadataSchema = z.object({
  tone: z.string().optional(),
  length: z.string().optional(),
});

export const CopyTemplateSchema = z.object({
  id: z.string().regex(/^OL\d{3}$/, 'Must be format OL001, OL002, etc.'),
  zodiac_group: z.array(ZodiacSchema).optional(),
  season: SeasonSchema.optional(),
  templates: CopyTemplatesSchema,
  metadata: CopyMetadataSchema.optional(),
});

export const CopyFileSchema = z.object({
  theme: ThemeSchema,
  copies: z.array(CopyTemplateSchema),
});

export type CopyTemplateSchemaType = z.infer<typeof CopyTemplateSchema>;
export type CopyFileSchemaType = z.infer<typeof CopyFileSchema>;
