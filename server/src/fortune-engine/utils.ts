import { Zodiac, Season, ZODIAC_KOREAN } from './types.js';

/**
 * FNV-1a 32-bit hash function
 * Used for deterministic random selection (same input = same output)
 */
export function hash32(input: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return h >>> 0; // Unsigned 32-bit
}

/**
 * Calculate daily score (60-100 range, dopamine-biased)
 */
export function calculateScore(userId: string, birthDate: string, targetDate: string): number {
  const h = hash32(`${userId}|${birthDate}|${targetDate}|score`);
  return 60 + (h % 41);
}

/**
 * Convert score to rank text
 */
export function scoreToRankText(score: number): string {
  if (score >= 95) return '빛나는 기운 (상위 1%)';
  if (score >= 90) return '빛나는 기운 (상위 3%)';
  if (score >= 85) return '좋은 기운 (상위 10%)';
  if (score >= 80) return '좋은 기운 (상위 20%)';
  if (score >= 75) return '괜찮은 기운 (상위 35%)';
  if (score >= 70) return '평온한 기운 (상위 50%)';
  if (score >= 65) return '신중의 기운 (상위 70%)';
  return '성찰의 기운 (상위 85%)';
}

/**
 * Get zodiac sign from birth date
 */
export function getZodiacFromBirthDate(birthDate: string): Zodiac {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const zodiacRanges: Array<{ zodiac: Zodiac; startMonth: number; startDay: number }> = [
    { zodiac: 'capricorn', startMonth: 12, startDay: 22 },
    { zodiac: 'aquarius', startMonth: 1, startDay: 20 },
    { zodiac: 'pisces', startMonth: 2, startDay: 19 },
    { zodiac: 'aries', startMonth: 3, startDay: 21 },
    { zodiac: 'taurus', startMonth: 4, startDay: 20 },
    { zodiac: 'gemini', startMonth: 5, startDay: 21 },
    { zodiac: 'cancer', startMonth: 6, startDay: 21 },
    { zodiac: 'leo', startMonth: 7, startDay: 23 },
    { zodiac: 'virgo', startMonth: 8, startDay: 23 },
    { zodiac: 'libra', startMonth: 9, startDay: 23 },
    { zodiac: 'scorpio', startMonth: 10, startDay: 23 },
    { zodiac: 'sagittarius', startMonth: 11, startDay: 22 },
  ];

  // Handle December Capricorn
  if (month === 12 && day >= 22) return 'capricorn';

  // Find matching zodiac
  for (let i = zodiacRanges.length - 1; i >= 0; i--) {
    const range = zodiacRanges[i];
    if (month > range.startMonth || (month === range.startMonth && day >= range.startDay)) {
      return range.zodiac;
    }
  }

  return 'capricorn'; // Default for early January
}

/**
 * Get season from date
 */
export function getSeasonFromDate(date: Date): Season {
  const month = date.getMonth() + 1;

  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

/**
 * Get month-day string (MM-DD) from date
 */
export function getMonthDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}-${day}`;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse date string to Date object (handles YYYYMMDD and YYYY-MM-DD)
 */
export function parseDate(dateStr: string): Date {
  if (dateStr.includes('-')) {
    return new Date(dateStr);
  }
  // YYYYMMDD format
  const year = parseInt(dateStr.slice(0, 4), 10);
  const month = parseInt(dateStr.slice(4, 6), 10) - 1;
  const day = parseInt(dateStr.slice(6, 8), 10);
  return new Date(year, month, day);
}

/**
 * Render template with variable substitution
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get Korean zodiac name
 */
export function getZodiacKorean(zodiac: Zodiac): string {
  return ZODIAC_KOREAN[zodiac];
}

/**
 * Tomorrow hint based on next day's score
 */
export function getTomorrowHint(userId: string, birthDate: string): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatDate(tomorrow);
  const score = calculateScore(userId, birthDate, tomorrowStr);

  if (score >= 90) return '내일은 특별한 기운이 감지됩니다...';
  if (score >= 80) return '밝은 에너지가 다가오고 있습니다...';
  if (score >= 70) return '평온한 하루가 예상됩니다...';
  return '신중한 움직임이 필요할 것 같습니다...';
}
