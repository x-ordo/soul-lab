import { FORTUNE_TEMPLATES } from '../data/fortuneTemplates';

export type FortuneTemplate = typeof FORTUNE_TEMPLATES[number];

export function hash32(input: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function pickTemplate(userKey: string, birthDateYYYYMMDD: string, targetDateYYYYMMDD: string): FortuneTemplate {
  const key = `${userKey}|${birthDateYYYYMMDD}|${targetDateYYYYMMDD}`;
  const idx = hash32(key) % FORTUNE_TEMPLATES.length;
  return FORTUNE_TEMPLATES[idx];
}

export function dailyScore(userKey: string, birthDateYYYYMMDD: string, targetDateYYYYMMDD: string): number {
  const h = hash32(`${userKey}|${birthDateYYYYMMDD}|${targetDateYYYYMMDD}|score`);
  // 도파민 편향: 60~100
  return 60 + (h % 41);
}

export function chemistryScore(aKey: string, bKey: string, targetDateYYYYMMDD: string): number {
  const [x, y] = [aKey, bKey].sort();
  const h = hash32(`${x}|${y}|${targetDateYYYYMMDD}|chem`);
  // 궁합은 더 극단적으로: 50~100
  return 50 + (h % 51);
}
