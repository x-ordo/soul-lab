/**
 * 신비로운 연출을 위한 유틸리티
 * - 동적 숫자 생성
 * - 시간대별 변동
 */

/**
 * 오늘의 인연 쌍 수 (동적으로 변동)
 * - 날짜 기반 시드로 자연스러운 변동
 * - 시간대별 증가로 "살아있는" 느낌
 */
export function getDailyPairCount(): string {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  const base = 2000 + (seed % 1500); // 2,000 ~ 3,499
  const hour = today.getHours();
  const growth = Math.floor(hour * (seed % 50)); // 시간대별 증가

  return (base + growth).toLocaleString();
}
