/**
 * Fortune API Client
 *
 * Connects frontend to the YAML rule engine on the server.
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

// Types matching server-side definitions
export type QuestionTag = 'career' | 'love' | 'money' | 'health' | 'relationship';

export interface FortuneRequest {
  user_id: string;
  name: string;
  birth_date: string; // YYYY-MM-DD
  birth_time?: string; // HH:mm
  gender?: 'male' | 'female' | 'other';
  question_tags?: QuestionTag[];
  date?: string; // Target date (defaults to today)
}

export interface FortuneDetails {
  lucky_time?: string;
  advice?: string;
  helper?: string;
  caution?: string;
  money_detail?: string;
  love_detail?: string;
  condition_detail?: string;
}

export interface FortuneResult {
  id: string;
  one_liner: string;
  summary: string;
  details?: FortuneDetails;
}

export interface FortuneExplain {
  matched_rules: string[];
  scores: Record<string, number>;
  selected_copy_id: string;
  determinism_seed: number;
}

export interface Fortune {
  date: string;
  theme: string;
  score: number;
  rank_text: string;
  result: FortuneResult;
  explain: FortuneExplain;
  tomorrow_hint: string;
}

export interface FortuneResponse {
  success: boolean;
  fortune?: Fortune;
  error?: string;
  message?: string;
}

// Cache for same-day requests
let cachedFortune: Fortune | null = null;
let cachedDateKey: string | null = null;
let cachedUserId: string | null = null;

function todayKey(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Fetch daily fortune from the rule engine API
 */
export async function fetchDailyFortune(req: FortuneRequest): Promise<FortuneResponse> {
  const res = await fetch(`${API_BASE}/api/fortune/daily`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'network_error' }));
    return {
      success: false,
      error: error.error || 'request_failed',
      message: error.message || `HTTP ${res.status}`,
    };
  }

  return res.json();
}

/**
 * Get cached or fetch daily fortune
 */
export async function getDailyFortune(
  userId: string,
  name: string,
  birthDate: string,
  questionTags?: QuestionTag[]
): Promise<Fortune> {
  const today = todayKey();

  // Return cached if same day and same user
  if (cachedFortune && cachedDateKey === today && cachedUserId === userId) {
    return cachedFortune;
  }

  const response = await fetchDailyFortune({
    user_id: userId,
    name,
    birth_date: birthDate,
    question_tags: questionTags,
    date: today,
  });

  if (!response.success || !response.fortune) {
    throw new Error(response.message || response.error || 'Failed to fetch fortune');
  }

  // Cache the result
  cachedFortune = response.fortune;
  cachedDateKey = today;
  cachedUserId = userId;

  return response.fortune;
}

/**
 * Convert fortune to legacy report format for compatibility
 */
export function fortuneToLegacyReport(fortune: Fortune) {
  return {
    templateId: fortune.result.id,
    subtitle: fortune.result.summary,
    score: fortune.score,
    rankText: fortune.rank_text,
    oneLiner: fortune.result.one_liner,
    luckyTime: fortune.result.details?.lucky_time,
    helper: fortune.result.details?.helper,
    caution: fortune.result.details?.caution,
    moneyDetail: fortune.result.details?.money_detail,
    loveDetail: fortune.result.details?.love_detail,
    conditionDetail: fortune.result.details?.condition_detail,
    theme: fortune.theme,
    tomorrowHint: fortune.tomorrow_hint,
    explain: fortune.explain,
  };
}
