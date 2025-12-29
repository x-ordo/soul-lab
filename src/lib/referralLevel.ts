/**
 * 친구 초대 레벨 시스템
 * - 1/5/10명 마일스톤
 * - 레벨별 칭호
 */

const KEY_REFERRAL_COUNT = 'sl_referral_count';

/**
 * 초대한 친구 수 조회
 */
export function getReferralCount(): number {
  return Number(localStorage.getItem(KEY_REFERRAL_COUNT) ?? '0');
}

/**
 * 초대 카운트 증가 (상대방이 수락 시 호출)
 */
export function incrementReferral(): number {
  const next = getReferralCount() + 1;
  localStorage.setItem(KEY_REFERRAL_COUNT, String(next));
  return next;
}

export type ReferralLevel = {
  name: string;
  icon: string;
  minCount: number;
};

/**
 * 초대 수에 따른 레벨 반환
 */
export function getReferralLevel(count: number): ReferralLevel {
  if (count >= 10)
    return { name: '우주적 매칭메이커', icon: '🌌', minCount: 10 };
  if (count >= 5)
    return { name: '운명의 중개자', icon: '🔗', minCount: 5 };
  if (count >= 1)
    return { name: '인연 탐색자', icon: '🔍', minCount: 1 };
  return { name: '새로운 시작', icon: '🌱', minCount: 0 };
}

/**
 * 레벨업 여부 확인
 * - 현재 카운트가 마일스톤에 정확히 도달했을 때만 true
 */
export function isLevelUp(count: number): boolean {
  return count === 1 || count === 5 || count === 10;
}

/**
 * 레벨업 메시지
 */
export function getLevelUpMessage(count: number): string | null {
  const level = getReferralLevel(count);
  if (!isLevelUp(count)) return null;
  return `🎉 "${level.icon} ${level.name}" 칭호를 획득했습니다!`;
}
