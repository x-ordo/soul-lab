export type AnalyticsEvent = {
  ts: number;
  name: string;
  props?: Record<string, unknown>;
  sid: string;
};

const KEY = 'sl_events_v1';
const KEY_SID = 'sl_sid_v1';

function getSid(): string {
  try {
    const existing = sessionStorage.getItem(KEY_SID);
    if (existing) return existing;
    const sid = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY_SID, sid);
    return sid;
  } catch {
    return 'nosession';
  }
}

export function track(name: string, props?: Record<string, unknown>) {
  try {
    const sid = getSid();
    const ev: AnalyticsEvent = { ts: Date.now(), name, props, sid };
    const raw = localStorage.getItem(KEY);
    const arr: AnalyticsEvent[] = raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
    arr.push(ev);
    // cap
    if (arr.length > 800) arr.splice(0, arr.length - 800);
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function getEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

export function clearEvents() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

export function exportEventsPretty(): string {
  return JSON.stringify(getEvents(), null, 2);
}
