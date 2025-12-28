import { todayKey } from './seed';
import { pickTemplate, dailyScore, chemistryScore, hash32 } from '../utils/engine';
import { getBirthDate } from './storage';

function rankText(score: number) {
  if (score >= 96) return '상위 1%';
  if (score >= 92) return '상위 3%';
  if (score >= 88) return '상위 7%';
  if (score >= 82) return '상위 15%';
  return '상위 30%';
}

export function makeTodayReport(userKey: string) {
  const bd = getBirthDate() ?? '19990101';
  const dk = todayKey();
  const tpl = pickTemplate(userKey, bd, dk);
  const score = dailyScore(userKey, bd, dk);
  return {
    templateId: tpl.id,
    subtitle: tpl.open.summary,
    score,
    rankText: rankText(score),
    oneLiner: tpl.open.oneLiner,
    luckyTime: tpl.locked.luckyTime,
    helper: tpl.locked.helper,
    caution: tpl.locked.caution,
  };
}

export function makeDetailReport(userKey: string) {
  const bd = getBirthDate() ?? '19990101';
  const dk = todayKey();
  const tpl = pickTemplate(userKey, bd, dk);
  const score = dailyScore(userKey, bd, dk);
  return {
    templateId: tpl.id,
    subtitle: `${tpl.open.oneLiner} (총점 ${score}점)`,
    summary: tpl.open.summary,
    money: tpl.locked.moneyDetail,
    love: tpl.locked.loveDetail,
    condition: tpl.locked.conditionDetail,
  };
}

export function makeChemistryReport(aKey: string, bKey: string) {
  const dk = todayKey();
  const score = chemistryScore(aKey, bKey, dk);

  const h = hash32(`${[aKey, bKey].sort().join('|')}|${dk}|chem_text`);
  const labels = ['폭발', '강력', '안정', '애매', '주의'];
  const label = labels[h % labels.length];

  const summary = score >= 85
    ? '서로의 약점을 “보완”하는 조합. 손을 잡으면 결과가 빨라집니다.'
    : score >= 70
      ? '서로를 자극합니다. 룰을 먼저 정하면 시너지가 납니다.'
      : '각자 스타일이 강합니다. 목표를 쪼개서 충돌을 줄이세요.';

  const friction = score >= 85
    ? '속도 차이: 한쪽은 “즉시”, 한쪽은 “확인 후”.'
    : score >= 70
      ? '우선순위: 돈/일 vs 감정/관계가 부딪힐 수 있음.'
      : '말투/톤: 짧은 말이 오해로 번지기 쉬움. “의도”를 먼저 말해라.';

  const booster = score >= 85
    ? '결정은 2분 안에. 대신 기록(메모)로 리스크를 닫아라.'
    : score >= 70
      ? '하루 1번만 “결론 한 문장” 공유하면 마찰이 줄어든다.'
      : '만나는 시간은 짧게, 빈도는 높게. 10분이라도 자주.';

  return { score, label, summary, friction, booster };
}
