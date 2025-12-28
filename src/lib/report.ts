import { todayKey } from './seed';
import { pickTemplate, dailyScore, chemistryScore, hash32 } from '../utils/engine';
import { getBirthDate } from './storage';

function rankText(score: number) {
  if (score >= 96) return '✨ 축복받은 운명 (상위 1%)';
  if (score >= 92) return '🌟 빛나는 기운 (상위 3%)';
  if (score >= 88) return '💫 강한 흐름 (상위 7%)';
  if (score >= 82) return '🌙 안정된 기운 (상위 15%)';
  return '☁️ 잠재된 기운 (상위 30%)';
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
  const labels = ['🔥 운명적 불꽃', '💫 강렬한 인연', '🌙 안정된 조화', '🌀 미묘한 기류', '⚡ 도전적 관계'];
  const label = labels[h % labels.length];

  const summary = score >= 85
    ? '✨ 두 영혼이 서로를 완성하는 조합입니다. 함께하면 빛이 더 강해집니다.'
    : score >= 70
      ? '💫 서로의 에너지가 부딪히며 불꽃을 만듭니다. 균형을 맞추면 시너지가 폭발합니다.'
      : '🌙 각자의 빛이 강한 두 별입니다. 거리를 두고 빛나면 서로를 비출 수 있습니다.';

  const friction = score >= 85
    ? '⚡ 흐름의 차이: 한쪽은 직감으로, 한쪽은 확인 후 움직입니다.'
    : score >= 70
      ? '🌀 우선순위의 엇갈림: 현실과 감정 사이에서 조율이 필요합니다.'
      : '💨 소통의 파장: 짧은 말이 깊은 오해가 될 수 있습니다. 마음을 먼저 전하세요.';

  const booster = score >= 85
    ? '🌟 직감을 믿되, 중요한 순간은 기록으로 남기세요. 두 에너지가 하나로 모입니다.'
    : score >= 70
      ? '💫 하루 한 번, 핵심만 나누세요. 작은 공유가 큰 이해를 만듭니다.'
      : '🌙 짧지만 자주 연결하세요. 잦은 교류가 파장을 맞춰갑니다.';

  return { score, label, summary, friction, booster };
}
