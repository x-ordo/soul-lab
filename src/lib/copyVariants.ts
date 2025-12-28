import type { Variant } from './variant';

export type CopyPack = {
  landingSubtitle: string;
  startCta: string;
  shareDaily: (link: string) => string;
  shareChemistry: (link: string) => string;
  lockReason: string;
  unlockedReason: string;
};

export function copyFor(v: Variant): CopyPack {
  if (v === 'A') {
    return {
      landingSubtitle: '오늘 점수는 공짜. 디테일은 “행동”으로 연다.',
      startCta: '1초 만에 분석 시작',
      shareDaily: (link) => `내 소울 랩 점수 떴다. 너도 찍어봐: ${link}`,
      shareChemistry: (link) => `너랑 내 케미 궁금함. 링크로 들어와: ${link}`,
      lockReason: '상세가 잠겨 있습니다. 광고 또는 “궁합 성사”로 오늘 잠금 해제.',
      unlockedReason: '오늘 상세가 열렸습니다. 지금 공유해서 다음 사람을 끌어오세요.',
    };
  }
  return {
    landingSubtitle: '가볍게 즐기는 분석. 오늘의 힌트를 확인해요.',
    startCta: '분석 시작하기',
    shareDaily: (link) => `오늘의 분석 결과 확인해봐: ${link}`,
    shareChemistry: (link) => `우리 케미 분석해볼래? ${link}`,
    lockReason: '상세가 잠겨 있어요. 광고 또는 궁합 성사로 열 수 있어요.',
    unlockedReason: '상세가 열렸어요. 공유하면 친구도 바로 확인할 수 있어요.',
  };
}
