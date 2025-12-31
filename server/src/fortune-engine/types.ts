// User Profile - Input DTO for fortune generation
export interface UserProfile {
  user_id: string;
  name: string;
  birth_date: string; // YYYY-MM-DD
  birth_time?: string; // HH:mm
  gender?: 'male' | 'female' | 'other';
  locale?: string; // default: 'ko-KR'
  timezone?: string; // default: 'Asia/Seoul'
  question_tags?: QuestionTag[];
  context?: Record<string, unknown>;
}

export type QuestionTag = 'career' | 'love' | 'money' | 'health' | 'relationship';

export type Theme = 'career' | 'love' | 'money' | 'health' | 'relationship' | 'general';

export type Zodiac =
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'leo'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// Rule Schema Types
export interface RuleCondition {
  zodiac?: { any_of: Zodiac[] };
  date_range?: { start: string; end: string }; // MM-DD format
  month_range?: { start: number; end: number };
  question_tags?: {
    any_of?: QuestionTag[];
    all_of?: QuestionTag[];
  };
  day_of_week?: number[]; // 0=Sunday, 1=Monday, etc.
}

export interface RuleEffect {
  themes: Partial<Record<Theme, number>>;
}

export interface Rule {
  id: string;
  name: string;
  conditions: RuleCondition;
  effects: RuleEffect;
  priority: number;
}

export interface RulesFile {
  rules: Rule[];
}

// Copy Template Types
export interface CopyTemplates {
  one_liner: string;
  summary: string;
  lucky_time?: string;
  advice?: string;
  helper?: string;
  caution?: string;
  money_detail?: string;
  love_detail?: string;
  condition_detail?: string;
}

export interface CopyTemplate {
  id: string;
  zodiac_group?: Zodiac[];
  season?: Season;
  templates: CopyTemplates;
  metadata?: {
    tone?: string;
    length?: string;
  };
}

export interface CopyFile {
  theme: Theme;
  copies: CopyTemplate[];
}

// Weights Configuration
export interface ThemeWeight {
  name: Theme;
  base_weight: number;
  display_name_ko: string;
  priority: number; // Tie-break priority (lower wins)
}

export interface DateModifier {
  period: {
    start?: string; // MM-DD
    end?: string; // MM-DD
    month?: number;
    day?: number;
  };
  theme: Theme;
  multiplier: number;
  reason?: string;
}

export interface WeightsConfig {
  version: number;
  themes: ThemeWeight[];
  date_modifiers: DateModifier[];
  fallback: {
    theme: Theme;
    copy_pool: string;
  };
}

// Evaluation Context
export interface EvaluationContext {
  user: UserProfile;
  targetDate: Date;
  zodiac: Zodiac;
  season: Season;
  dayOfWeek: number;
  monthDay: string; // MM-DD
  questionTags: QuestionTag[];
}

// Fortune Result - Output DTO
export interface FortuneResult {
  date: string; // YYYY-MM-DD
  theme: Theme;
  score: number; // 60-100
  rank_text: string;
  result: {
    id: string;
    one_liner: string;
    summary: string;
    details?: {
      lucky_time?: string;
      advice?: string;
      helper?: string;
      caution?: string;
      money_detail?: string;
      love_detail?: string;
      condition_detail?: string;
    };
  };
  explain: {
    matched_rules: string[];
    scores: Record<Theme, number>;
    selected_copy_id: string;
    determinism_seed: number;
  };
}

// Zodiac utilities
export const ZODIAC_LIST: Zodiac[] = [
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
];

export const ZODIAC_KOREAN: Record<Zodiac, string> = {
  aries: '양자리',
  taurus: '황소자리',
  gemini: '쌍둥이자리',
  cancer: '게자리',
  leo: '사자자리',
  virgo: '처녀자리',
  libra: '천칭자리',
  scorpio: '전갈자리',
  sagittarius: '사수자리',
  capricorn: '염소자리',
  aquarius: '물병자리',
  pisces: '물고기자리',
};

export const THEME_LIST: Theme[] = [
  'career',
  'love',
  'money',
  'health',
  'relationship',
  'general',
];
