/**
 * 타로 카드 엔진
 * 78장 덱 + 다양한 스프레드 지원
 */

// FNV-1a 해시 함수 (결정론적 시드)
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// 시드 기반 셔플
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let s = seed;

  for (let i = shuffled.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export interface TarotCard {
  id: string;
  name: string;
  nameKorean: string;
  arcana: 'major' | 'minor';
  suit?: 'wands' | 'cups' | 'swords' | 'pentacles';
  number?: number;
  emoji: string;
  keywords: string[];
  upright: string;
  reversed: string;
  element?: string;
  planet?: string;
  zodiac?: string;
}

export interface DrawnCard extends TarotCard {
  isReversed: boolean;
  position: string;
  positionKorean: string;
  interpretation: string;
}

export interface TarotReading {
  spread: DrawnCard[];
  spreadType: string;
  spreadTypeKorean: string;
  question?: string;
  summary: string;
  advice: string;
  timestamp: Date;
}

// 메이저 아르카나 22장
const MAJOR_ARCANA: TarotCard[] = [
  { id: 'major_0', name: 'The Fool', nameKorean: '바보', arcana: 'major', emoji: '🃏', keywords: ['시작', '순수', '모험', '자유'], upright: '새로운 시작, 순수한 마음으로 모험을 떠날 때입니다.', reversed: '무모함, 경솔한 결정을 피하세요.', planet: 'Uranus' },
  { id: 'major_1', name: 'The Magician', nameKorean: '마법사', arcana: 'major', emoji: '🧙', keywords: ['능력', '의지', '창조', '집중'], upright: '당신의 능력을 발휘할 때입니다. 모든 자원이 준비되어 있습니다.', reversed: '재능의 낭비, 속임수를 조심하세요.', planet: 'Mercury' },
  { id: 'major_2', name: 'The High Priestess', nameKorean: '여사제', arcana: 'major', emoji: '🌙', keywords: ['직관', '비밀', '지혜', '내면'], upright: '직관을 따르세요. 숨겨진 진실이 드러납니다.', reversed: '내면의 목소리를 무시하지 마세요.', planet: 'Moon' },
  { id: 'major_3', name: 'The Empress', nameKorean: '여제', arcana: 'major', emoji: '👑', keywords: ['풍요', '모성', '창조', '자연'], upright: '풍요와 성장의 시기입니다. 창조적 에너지가 흘러넘칩니다.', reversed: '창조적 막힘, 자기 돌봄이 필요합니다.', planet: 'Venus' },
  { id: 'major_4', name: 'The Emperor', nameKorean: '황제', arcana: 'major', emoji: '🦁', keywords: ['권위', '구조', '아버지', '통제'], upright: '구조와 질서를 세울 때입니다. 리더십을 발휘하세요.', reversed: '지나친 통제, 유연성이 필요합니다.', zodiac: 'Aries' },
  { id: 'major_5', name: 'The Hierophant', nameKorean: '교황', arcana: 'major', emoji: '⛪', keywords: ['전통', '가르침', '신앙', '제도'], upright: '전통적 지혜를 따르세요. 멘토를 찾을 때입니다.', reversed: '기존 관습에 도전할 때입니다.', zodiac: 'Taurus' },
  { id: 'major_6', name: 'The Lovers', nameKorean: '연인', arcana: 'major', emoji: '💕', keywords: ['사랑', '선택', '조화', '파트너십'], upright: '중요한 선택의 시간입니다. 마음을 따르세요.', reversed: '관계의 불균형, 가치관 충돌.', zodiac: 'Gemini' },
  { id: 'major_7', name: 'The Chariot', nameKorean: '전차', arcana: 'major', emoji: '🏎️', keywords: ['의지', '승리', '결단', '전진'], upright: '승리가 다가옵니다. 의지력으로 장애물을 극복하세요.', reversed: '방향 상실, 통제력 약화.', zodiac: 'Cancer' },
  { id: 'major_8', name: 'Strength', nameKorean: '힘', arcana: 'major', emoji: '🦋', keywords: ['용기', '인내', '내면의 힘', '자비'], upright: '내면의 힘으로 상황을 다스리세요. 부드러움이 강함입니다.', reversed: '자기 의심, 내면의 갈등.', zodiac: 'Leo' },
  { id: 'major_9', name: 'The Hermit', nameKorean: '은둔자', arcana: 'major', emoji: '🏔️', keywords: ['성찰', '고독', '지혜', '탐구'], upright: '내면의 답을 찾을 때입니다. 고요함 속에서 지혜가 옵니다.', reversed: '고립, 과도한 자기 분석.', zodiac: 'Virgo' },
  { id: 'major_10', name: 'Wheel of Fortune', nameKorean: '운명의 수레바퀴', arcana: 'major', emoji: '🎡', keywords: ['변화', '운명', '순환', '전환점'], upright: '운명의 바퀴가 돌아갑니다. 변화를 받아들이세요.', reversed: '불운의 주기, 저항은 무의미합니다.', planet: 'Jupiter' },
  { id: 'major_11', name: 'Justice', nameKorean: '정의', arcana: 'major', emoji: '⚖️', keywords: ['균형', '공정', '인과', '진실'], upright: '공정한 결과가 옵니다. 진실이 밝혀집니다.', reversed: '불공정, 책임 회피.', zodiac: 'Libra' },
  { id: 'major_12', name: 'The Hanged Man', nameKorean: '매달린 사람', arcana: 'major', emoji: '🙃', keywords: ['희생', '새로운 시각', '기다림', '포기'], upright: '다른 관점으로 보세요. 기다림이 답입니다.', reversed: '불필요한 희생, 지연.', planet: 'Neptune' },
  { id: 'major_13', name: 'Death', nameKorean: '죽음', arcana: 'major', emoji: '🦋', keywords: ['변환', '끝', '시작', '재탄생'], upright: '끝은 새로운 시작입니다. 변화를 두려워 마세요.', reversed: '변화에 대한 저항, 정체.', zodiac: 'Scorpio' },
  { id: 'major_14', name: 'Temperance', nameKorean: '절제', arcana: 'major', emoji: '🌊', keywords: ['균형', '인내', '조화', '중용'], upright: '균형과 조화를 찾으세요. 인내가 필요합니다.', reversed: '불균형, 과도함.', zodiac: 'Sagittarius' },
  { id: 'major_15', name: 'The Devil', nameKorean: '악마', arcana: 'major', emoji: '😈', keywords: ['속박', '유혹', '그림자', '집착'], upright: '속박에서 벗어나세요. 당신을 묶는 것은 무엇인가요?', reversed: '해방, 속박에서 벗어남.', zodiac: 'Capricorn' },
  { id: 'major_16', name: 'The Tower', nameKorean: '탑', arcana: 'major', emoji: '⚡', keywords: ['급변', '해방', '깨달음', '붕괴'], upright: '예상치 못한 변화가 옵니다. 하지만 이것은 해방입니다.', reversed: '변화 회피, 더 큰 폭풍 전 고요.', planet: 'Mars' },
  { id: 'major_17', name: 'The Star', nameKorean: '별', arcana: 'major', emoji: '⭐', keywords: ['희망', '영감', '평온', '치유'], upright: '희망이 보입니다. 우주가 당신을 축복합니다.', reversed: '희망 상실, 자기 의심.', zodiac: 'Aquarius' },
  { id: 'major_18', name: 'The Moon', nameKorean: '달', arcana: 'major', emoji: '🌕', keywords: ['환상', '직관', '두려움', '무의식'], upright: '직관을 믿으세요. 숨겨진 것들이 드러납니다.', reversed: '혼란 해소, 진실 직면.', zodiac: 'Pisces' },
  { id: 'major_19', name: 'The Sun', nameKorean: '태양', arcana: 'major', emoji: '☀️', keywords: ['성공', '기쁨', '활력', '명확함'], upright: '성공과 기쁨의 시기입니다. 빛이 당신을 비춥니다.', reversed: '일시적 그늘, 곧 빛이 돌아옵니다.', planet: 'Sun' },
  { id: 'major_20', name: 'Judgement', nameKorean: '심판', arcana: 'major', emoji: '📯', keywords: ['부활', '소명', '결산', '각성'], upright: '새로운 부름을 들으세요. 과거를 정리하고 일어날 때입니다.', reversed: '자기 회의, 내면의 목소리 무시.', planet: 'Pluto' },
  { id: 'major_21', name: 'The World', nameKorean: '세계', arcana: 'major', emoji: '🌍', keywords: ['완성', '통합', '성취', '여행'], upright: '한 사이클이 완성됩니다. 축하하세요!', reversed: '미완성, 마무리가 필요합니다.', planet: 'Saturn' }
];

// 마이너 아르카나 (각 슈트 14장 × 4 = 56장)
type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';

function generateMinorArcana(): TarotCard[] {
  const suits: Array<{ suit: Suit; nameKorean: string; element: string; emoji: string; theme: string }> = [
    { suit: 'wands', nameKorean: '완드', element: 'Fire', emoji: '🔥', theme: '열정, 창조, 행동' },
    { suit: 'cups', nameKorean: '컵', element: 'Water', emoji: '💧', theme: '감정, 관계, 직관' },
    { suit: 'swords', nameKorean: '검', element: 'Air', emoji: '💨', theme: '사고, 소통, 갈등' },
    { suit: 'pentacles', nameKorean: '펜타클', element: 'Earth', emoji: '🌍', theme: '물질, 건강, 재정' }
  ];

  const cards: TarotCard[] = [];

  for (const { suit, nameKorean, element, emoji, theme } of suits) {
    // 숫자 카드 (Ace ~ 10)
    const numberMeanings = [
      { n: 1, name: 'Ace', korean: '에이스', keywords: ['시작', '잠재력'], up: '새로운 시작의 에너지', rev: '막힌 에너지' },
      { n: 2, name: 'Two', korean: '2', keywords: ['균형', '결정'], up: '선택의 순간', rev: '불균형' },
      { n: 3, name: 'Three', korean: '3', keywords: ['성장', '창조'], up: '첫 번째 결실', rev: '지연' },
      { n: 4, name: 'Four', korean: '4', keywords: ['안정', '기반'], up: '기반 다지기', rev: '정체' },
      { n: 5, name: 'Five', korean: '5', keywords: ['갈등', '변화'], up: '도전과 갈등', rev: '화해' },
      { n: 6, name: 'Six', korean: '6', keywords: ['조화', '승리'], up: '승리와 인정', rev: '자만' },
      { n: 7, name: 'Seven', korean: '7', keywords: ['도전', '평가'], up: '내면의 도전', rev: '회피' },
      { n: 8, name: 'Eight', korean: '8', keywords: ['움직임', '속도'], up: '빠른 진전', rev: '지연' },
      { n: 9, name: 'Nine', korean: '9', keywords: ['완성 직전', '지혜'], up: '거의 완성', rev: '불안' },
      { n: 10, name: 'Ten', korean: '10', keywords: ['완성', '과부하'], up: '한 사이클의 완성', rev: '부담' }
    ];

    for (const m of numberMeanings) {
      cards.push({
        id: `minor_${suit}_${m.n}`,
        name: `${m.name} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`,
        nameKorean: `${nameKorean}의 ${m.korean}`,
        arcana: 'minor',
        suit,
        number: m.n,
        emoji,
        keywords: [...m.keywords, theme.split(', ')[0]],
        upright: `${m.up} - ${theme}의 영역에서.`,
        reversed: `${m.rev} - ${theme}의 에너지가 막혀 있습니다.`,
        element
      });
    }

    // 코트 카드 (Page, Knight, Queen, King)
    const courtCards = [
      { name: 'Page', korean: '시종', keywords: ['학습', '메시지'], up: '새로운 배움', rev: '미성숙' },
      { name: 'Knight', korean: '기사', keywords: ['행동', '여정'], up: '적극적 전진', rev: '성급함' },
      { name: 'Queen', korean: '여왕', keywords: ['수용', '직관'], up: '성숙한 에너지', rev: '의존' },
      { name: 'King', korean: '왕', keywords: ['권위', '통제'], up: '완전한 지배력', rev: '폭군' }
    ];

    let courtNum = 11;
    for (const c of courtCards) {
      cards.push({
        id: `minor_${suit}_${courtNum}`,
        name: `${c.name} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`,
        nameKorean: `${nameKorean}의 ${c.korean}`,
        arcana: 'minor',
        suit,
        number: courtNum,
        emoji,
        keywords: [...c.keywords, theme.split(', ')[0]],
        upright: `${c.up} - ${theme}의 인물.`,
        reversed: `${c.rev} - ${theme}의 그림자.`,
        element
      });
      courtNum++;
    }
  }

  return cards;
}

// 전체 덱
const TAROT_DECK: TarotCard[] = [...MAJOR_ARCANA, ...generateMinorArcana()];

// 스프레드 정의
interface SpreadDefinition {
  name: string;
  nameKorean: string;
  positions: Array<{ position: string; positionKorean: string }>;
  description: string;
}

const SPREADS: Record<string, SpreadDefinition> = {
  single: {
    name: 'Single Card',
    nameKorean: '원카드',
    positions: [{ position: 'message', positionKorean: '오늘의 메시지' }],
    description: '오늘 하루를 위한 핵심 메시지'
  },
  three: {
    name: 'Three Card Spread',
    nameKorean: '쓰리카드',
    positions: [
      { position: 'past', positionKorean: '과거' },
      { position: 'present', positionKorean: '현재' },
      { position: 'future', positionKorean: '미래' }
    ],
    description: '과거-현재-미래의 흐름'
  },
  celtic: {
    name: 'Celtic Cross',
    nameKorean: '켈틱 크로스',
    positions: [
      { position: 'present', positionKorean: '현재 상황' },
      { position: 'challenge', positionKorean: '도전' },
      { position: 'subconscious', positionKorean: '무의식' },
      { position: 'past', positionKorean: '과거' },
      { position: 'conscious', positionKorean: '의식/목표' },
      { position: 'future', positionKorean: '가까운 미래' },
      { position: 'self', positionKorean: '자신' },
      { position: 'environment', positionKorean: '환경' },
      { position: 'hopes_fears', positionKorean: '희망과 두려움' },
      { position: 'outcome', positionKorean: '최종 결과' }
    ],
    description: '심층 분석을 위한 10장 스프레드'
  },
  love: {
    name: 'Love Spread',
    nameKorean: '연애 스프레드',
    positions: [
      { position: 'you', positionKorean: '당신' },
      { position: 'partner', positionKorean: '상대방' },
      { position: 'relationship', positionKorean: '관계' },
      { position: 'challenge', positionKorean: '도전' },
      { position: 'advice', positionKorean: '조언' }
    ],
    description: '연애와 관계를 위한 5장 스프레드'
  },
  career: {
    name: 'Career Spread',
    nameKorean: '커리어 스프레드',
    positions: [
      { position: 'current', positionKorean: '현재 직업/상황' },
      { position: 'obstacle', positionKorean: '장애물' },
      { position: 'strength', positionKorean: '강점' },
      { position: 'opportunity', positionKorean: '기회' },
      { position: 'action', positionKorean: '행동 지침' }
    ],
    description: '커리어와 사업을 위한 5장 스프레드'
  }
};

/**
 * 타로 카드 뽑기
 * @param userKey 사용자 식별자
 * @param dateKey 날짜 키 (YYYYMMDD)
 * @param spreadType 스프레드 타입
 * @param question 질문 (선택)
 */
export function drawCards(
  userKey: string,
  dateKey: string,
  spreadType: keyof typeof SPREADS = 'single',
  question?: string
): TarotReading {
  const spread = SPREADS[spreadType];
  if (!spread) throw new Error(`Unknown spread type: ${spreadType}`);

  // 결정론적 시드 생성
  const seed = hash32(`${userKey}|${dateKey}|${spreadType}|${question || ''}`);
  const shuffled = seededShuffle(TAROT_DECK, seed);

  // 카드 뽑기
  const drawnCards: DrawnCard[] = spread.positions.map((pos, idx) => {
    const card = shuffled[idx];
    const isReversed = ((seed >> (idx * 3)) & 1) === 1; // 시드 기반 역방향 결정

    return {
      ...card,
      isReversed,
      position: pos.position,
      positionKorean: pos.positionKorean,
      interpretation: isReversed ? card.reversed : card.upright
    };
  });

  // 요약 생성
  const summary = generateReadingSummary(drawnCards, spreadType);
  const advice = generateAdvice(drawnCards);

  return {
    spread: drawnCards,
    spreadType,
    spreadTypeKorean: spread.nameKorean,
    question,
    summary,
    advice,
    timestamp: new Date()
  };
}

function generateReadingSummary(cards: DrawnCard[], spreadType: string): string {
  const majorCards = cards.filter(c => c.arcana === 'major');
  const reversedCount = cards.filter(c => c.isReversed).length;

  let summary = '';

  if (majorCards.length > cards.length / 2) {
    summary += '메이저 아르카나가 많이 등장했습니다. 이것은 인생의 중요한 전환점을 의미합니다. ';
  }

  if (reversedCount > cards.length / 2) {
    summary += '역방향 카드가 많습니다. 내면의 작업이 필요한 시기입니다. ';
  }

  // 첫 번째 카드 기반 핵심 메시지
  const keyCard = cards[0];
  summary += `${keyCard.nameKorean}이(가) 핵심 메시지를 전합니다: ${keyCard.interpretation}`;

  return summary;
}

function generateAdvice(cards: DrawnCard[]): string {
  // 마지막 카드 또는 조언 포지션 카드
  const adviceCard = cards.find(c => c.position === 'advice') || cards[cards.length - 1];

  const adviceKeywords = adviceCard.keywords.join(', ');
  return `${adviceCard.nameKorean}의 지혜: ${adviceKeywords}에 집중하세요. ${adviceCard.isReversed ? '내면을 먼저 살피세요.' : '적극적으로 행동하세요.'}`;
}

/**
 * 오늘의 카드 (일일 메시지)
 */
export function getDailyCard(userKey: string, dateKey: string): DrawnCard {
  const reading = drawCards(userKey, dateKey, 'single');
  return reading.spread[0];
}

/**
 * 전체 덱 조회
 */
export function getTarotDeck(): TarotCard[] {
  return TAROT_DECK;
}

/**
 * 특정 카드 조회
 */
export function getCard(cardId: string): TarotCard | undefined {
  return TAROT_DECK.find(c => c.id === cardId);
}

/**
 * 스프레드 목록 조회
 */
export function getSpreads(): typeof SPREADS {
  return SPREADS;
}
