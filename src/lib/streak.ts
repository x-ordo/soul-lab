import { todayKey, yesterdayKey, dateKey } from './seed';

const KEY_LAST = 'sl_last_seen';
const KEY_STREAK = 'sl_streak';
const KEY_GRACE_USED = 'sl_grace_used';

export function getStreak(): number {
  const n = Number(localStorage.getItem(KEY_STREAK) ?? '0');
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * 그레이스 데이 사용 여부
 * - 하루 놓쳐도 스트릭 유지 (단, 증가는 안 함)
 */
export function wasGraceUsed(): boolean {
  return localStorage.getItem(KEY_GRACE_USED) === 'true';
}

export function clearGraceFlag(): void {
  localStorage.removeItem(KEY_GRACE_USED);
}

export function updateStreak(): number {
  const today = todayKey();
  const last = localStorage.getItem(KEY_LAST) ?? '';
  const prev = getStreak();
  const twoDaysAgo = dateKey(-2);

  let next = prev;

  if (!last) {
    next = 1;
  } else if (last === today) {
    next = prev || 1;
  } else if (last === yesterdayKey()) {
    next = (prev || 1) + 1;
    // 연속 방문 시 그레이스 플래그 클리어
    clearGraceFlag();
  } else if (last === twoDaysAgo) {
    // 그레이스 데이: 2일 전 방문 → 스트릭 유지 (증가 X)
    next = prev || 1;
    localStorage.setItem(KEY_GRACE_USED, 'true');
  } else {
    next = 1;
  }

  localStorage.setItem(KEY_LAST, today);
  localStorage.setItem(KEY_STREAK, String(next));
  return next;
}
