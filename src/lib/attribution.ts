import { todayKey } from './seed';

export type EntryType = 'solo' | 'chemistry' | 'unknown';

export type Attribution = {
  entryType: EntryType;
  referrerId?: string;
  variant?: string;
  dateKey: string;
};

const KEY = 'sl_attribution';

export function getAttribution(): Attribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Attribution;
  } catch {
    return null;
  }
}

export function setAttribution(a: Attribution) {
  localStorage.setItem(KEY, JSON.stringify(a));
}

export function captureAttributionFromUrl(search: string, pathname: string) {
  const sp = new URLSearchParams(search);

  const typeParam = sp.get('type') ?? '';
  const entryType: EntryType =
    pathname.startsWith('/chemistry') || typeParam === 'chemistry' ? 'chemistry' : typeParam === 'solo' ? 'solo' : 'unknown';

  const referrerId = sp.get('referrer_id') ?? sp.get('from') ?? undefined;
  const variant = sp.get('v') ?? undefined;

  setAttribution({
    entryType,
    referrerId,
    variant,
    dateKey: todayKey(),
  });
}
