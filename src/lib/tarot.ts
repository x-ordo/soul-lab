import { todayKey } from './seed';
import { hash32 } from '../utils/engine';
import { getBirthDate } from './storage';
import { TAROT_DECK, TarotCard } from '../data/tarotCards';

export type DrawnCard = {
  card: TarotCard;
  isReversed: boolean;
  position: 'past' | 'present' | 'future';
  positionLabel: string;
};

export type TarotReading = {
  cards: DrawnCard[];
  readingDate: string;
  summary: string;
};

// 3카드 스프레드: 과거/현재/미래
export function drawThreeCardSpread(userKey: string): TarotReading {
  const bd = getBirthDate() ?? '19990101';
  const dk = todayKey();
  const seed = `${userKey}|${bd}|${dk}|tarot`;

  // 78장에서 3장 선택 (중복 없이)
  const indices: number[] = [];
  for (let i = 0; i < 3; i++) {
    let h = hash32(`${seed}|card${i}`);
    let idx = h % 78;
    // 중복 방지
    while (indices.includes(idx)) {
      h = hash32(`${seed}|card${i}|${h}`);
      idx = h % 78;
    }
    indices.push(idx);
  }

  const positions: Array<{ position: DrawnCard['position']; label: string }> = [
    { position: 'past', label: '🌙 과거' },
    { position: 'present', label: '☀️ 현재' },
    { position: 'future', label: '⭐ 미래' },
  ];

  const cards: DrawnCard[] = indices.map((cardIdx, i) => {
    const card = TAROT_DECK[cardIdx];
    const reversedHash = hash32(`${seed}|reversed${i}`);
    const isReversed = reversedHash % 3 === 0; // 약 33% 확률로 역방향

    return {
      card,
      isReversed,
      position: positions[i].position,
      positionLabel: positions[i].label,
    };
  });

  const summary = generateReadingSummary(cards);

  return {
    cards,
    readingDate: dk,
    summary,
  };
}

function generateReadingSummary(cards: DrawnCard[]): string {
  const past = cards[0];
  const present = cards[1];
  const future = cards[2];

  const pastKeyword = past.isReversed ? past.card.reversed.keyword : past.card.upright.keyword;
  const presentKeyword = present.isReversed ? present.card.reversed.keyword : present.card.upright.keyword;
  const futureKeyword = future.isReversed ? future.card.reversed.keyword : future.card.upright.keyword;

  return `과거의 '${pastKeyword}'에서 현재 '${presentKeyword}'를 거쳐 미래에는 '${futureKeyword}'(으)로 흘러갑니다.`;
}

// 오늘의 한 장 카드
export function drawDailyCard(userKey: string): DrawnCard {
  const bd = getBirthDate() ?? '19990101';
  const dk = todayKey();
  const seed = `${userKey}|${bd}|${dk}|daily_tarot`;

  const cardIdx = hash32(seed) % 78;
  const isReversed = hash32(`${seed}|rev`) % 3 === 0;

  return {
    card: TAROT_DECK[cardIdx],
    isReversed,
    position: 'present',
    positionLabel: '✨ 오늘의 카드',
  };
}
