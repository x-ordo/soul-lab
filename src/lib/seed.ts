/**
 * Date key in KST (Asia/Seoul): YYYYMMDD
 * - deterministic for "today" reports
 * - do NOT use '-' in the key to keep storage/urls compact
 */
export function todayKey(): string {

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA => YYYY-MM-DD
  const ymd = fmt.format(new Date()).replace(/-/g, '');
  return ymd;
}


export function dateKey(offsetDays = 0): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return fmt.format(d).replace(/-/g, '');
}

export function yesterdayKey(): string {
  return dateKey(-1);
}

// xfnv1a: 짧고 빠른 문자열 해시(결정적)
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// mulberry32: 시드 기반 결정적 RNG
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function isYYYYMMDD(v: string): boolean {
  return /^\d{8}$/.test(v);
}
