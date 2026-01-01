/**
 * Input Validation Schemas
 *
 * Zod-based request validation for all API endpoints.
 * Prevents injection attacks and ensures data integrity.
 */

import { z } from 'zod';

// ============================================================
// Common Patterns
// ============================================================

// User key: alphanumeric + hyphen/underscore, 8-64 chars
const userKeySchema = z.string()
  .min(8, 'userKey must be at least 8 characters')
  .max(64, 'userKey must be at most 64 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'userKey must be alphanumeric with hyphens/underscores only');

// Date key: YYYY-MM-DD format
const dateKeySchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateKey must be in YYYY-MM-DD format');

// ISO date string (more flexible)
const isoDateSchema = z.string()
  .refine(
    (val) => !isNaN(Date.parse(val)),
    { message: 'Invalid date format' }
  );

// Time string: HH:mm or HH:mm:ss
const timeSchema = z.string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be in HH:mm or HH:mm:ss format');

// Latitude: -90 to 90
const latitudeSchema = z.number()
  .min(-90, 'Latitude must be between -90 and 90')
  .max(90, 'Latitude must be between -90 and 90');

// Longitude: -180 to 180
const longitudeSchema = z.number()
  .min(-180, 'Longitude must be between -180 and 180')
  .max(180, 'Longitude must be between -180 and 180');

// Credit amount: positive integer
const creditAmountSchema = z.number()
  .int('Amount must be an integer')
  .positive('Amount must be positive');

// Order ID: alphanumeric + hyphen/underscore, 8-128 chars
const orderIdSchema = z.string()
  .min(8, 'orderId must be at least 8 characters')
  .max(128, 'orderId must be at most 128 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'orderId must be alphanumeric with hyphens/underscores only');

// Payment key: from Toss Payments
const paymentKeySchema = z.string()
  .min(1, 'paymentKey is required')
  .max(256, 'paymentKey too long');

// Model tier
const modelTierSchema = z.enum(['mini', 'standard', 'premium']).optional();

// ============================================================
// Credits API Schemas
// ============================================================

export const BalanceRequestSchema = z.object({
  userKey: userKeySchema,
});

export const UseCreditsRequestSchema = z.object({
  userKey: userKeySchema,
  action: z.string().min(1).max(64),
  description: z.string().max(256).optional(),
});

export const PurchaseStartRequestSchema = z.object({
  userKey: userKeySchema,
  orderId: orderIdSchema,
  sku: z.string().min(1).max(64),
  amount: creditAmountSchema.optional(),
});

export const PurchaseCompleteRequestSchema = z.object({
  orderId: orderIdSchema,
  paymentKey: paymentKeySchema,
});

export const ReferralClaimRequestSchema = z.object({
  inviterKey: userKeySchema,
  inviteeKey: userKeySchema,
  dateKey: dateKeySchema,
  claimerKey: userKeySchema,
});

export const ReferralStatusRequestSchema = z.object({
  inviterKey: userKeySchema,
  inviteeKey: userKeySchema,
  dateKey: dateKeySchema,
});

export const StreakClaimRequestSchema = z.object({
  userKey: userKeySchema,
  dateKey: dateKeySchema,
  streak: z.number().int().min(1, 'streak must be at least 1'),
});

export const StreakStatusRequestSchema = z.object({
  userKey: userKeySchema,
  dateKey: dateKeySchema,
});

export const TransactionHistoryRequestSchema = z.object({
  userKey: userKeySchema,
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const UserKeyQuerySchema = z.object({
  userKey: userKeySchema,
});

export const PurchasesQuerySchema = z.object({
  userKey: userKeySchema,
});

export const PendingQuerySchema = z.object({
  userKey: userKeySchema,
});

export const StreakHistoryQuerySchema = z.object({
  userKey: userKeySchema,
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// ============================================================
// Fortune API Schemas
// ============================================================

export const NatalChartRequestSchema = z.object({
  birthDate: isoDateSchema,
  birthTime: timeSchema,
  latitude: latitudeSchema,
  longitude: longitudeSchema,
});

export const TransitRequestSchema = z.object({
  targetDate: isoDateSchema.optional(),
});

export const SynastryRequestSchema = z.object({
  person1: NatalChartRequestSchema,
  person2: NatalChartRequestSchema,
  tier: modelTierSchema,
});

export const TarotDrawRequestSchema = z.object({
  userKey: userKeySchema,
  dateKey: dateKeySchema,
  spreadType: z.enum(['single', 'three', 'celtic', 'love', 'career']),
  question: z.string().max(500).optional(),
});

export const TarotInterpretRequestSchema = z.object({
  reading: z.object({
    id: z.string(),
    spreadType: z.string(),
    cards: z.array(z.object({
      card: z.object({
        id: z.number(),
        name: z.string(),
        nameKorean: z.string(),
      }),
      position: z.number(),
      isReversed: z.boolean(),
    })),
    question: z.string().optional(),
    drawnAt: z.string(),
  }),
  question: z.string().max(500).optional(),
  tier: modelTierSchema,
});

export const AIConsultRequestSchema = z.object({
  birthDate: isoDateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  question: z.string()
    .min(1, 'Question is required')
    .max(1000, 'Question too long'),
  type: z.enum(['chat', 'love', 'career', 'health', 'money', 'general']).optional(),
  tier: modelTierSchema,
  includeTarot: z.boolean().optional(),
  spreadType: z.enum(['single', 'three', 'celtic', 'love', 'career']).optional(),
});

export const DailyFortuneRequestSchema = z.object({
  userKey: userKeySchema,
  birthDate: isoDateSchema,
  birthTime: timeSchema.optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  tier: modelTierSchema,
});

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(4000),
});

export const AIChatRequestSchema = z.object({
  userKey: userKeySchema.optional(),
  birthdate: z.string()
    .regex(/^\d{8}$/, 'birthdate must be YYYYMMDD format')
    .optional(),
  messages: z.array(ChatMessageSchema)
    .min(1, 'At least one message required')
    .max(20, 'Too many messages'),
  tier: modelTierSchema,
});

export const RuleFortuneRequestSchema = z.object({
  user_id: z.string().min(1).max(64),
  name: z.string().min(1).max(64),
  birth_date: isoDateSchema,
  birth_time: timeSchema.optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  question_tags: z.array(z.string()).optional(),
  date: isoDateSchema.optional(),
});

// ============================================================
// Invite API Schemas
// ============================================================

export const CreateInviteRequestSchema = z.object({
  inviterKey: userKeySchema,
});

export const JoinInviteRequestSchema = z.object({
  userKey: userKeySchema,
});

export const ReissueInviteRequestSchema = z.object({
  userKey: userKeySchema,
});

// ============================================================
// Reward API Schemas
// ============================================================

export const RewardEarnRequestSchema = z.object({
  userKey: userKeySchema,
  dateKey: dateKeySchema,
  scope: z.string().max(64).optional(),
});

// ============================================================
// Admin API Schemas
// ============================================================

export const AdminLoginRequestSchema = z.object({
  password: z.string().min(8).max(128),
});

// ============================================================
// Validation Helper
// ============================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Format first error for response
  const firstError = result.error.errors[0];
  const path = firstError.path.length > 0 ? `${firstError.path.join('.')}: ` : '';
  return { success: false, error: `${path}${firstError.message}` };
}
