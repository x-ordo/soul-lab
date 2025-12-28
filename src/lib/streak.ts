import { todayKey, yesterdayKey } from './seed';

const KEY_LAST = 'sl_last_seen';
const KEY_STREAK = 'sl_streak';

export function getStreak(): number {
  const n = Number(localStorage.getItem(KEY_STREAK) ?? '0');
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function updateStreak(): number {
  const today = todayKey();
  const last = localStorage.getItem(KEY_LAST) ?? '';
  const prev = getStreak();

  let next = prev;

  if (!last) {
    next = 1;
  } else if (last === today) {
    next = prev || 1;
  } else if (last === yesterdayKey()) {
    next = (prev || 1) + 1;
  } else {
    next = 1;
  }

  localStorage.setItem(KEY_LAST, today);
  localStorage.setItem(KEY_STREAK, String(next));
  return next;
}
