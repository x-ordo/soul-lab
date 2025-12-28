import { parse } from 'yaml';
import rawYaml from './tarotCards.yaml?raw';

type CardMeaning = {
  keyword: string;
  meaning: string;
  advice: string;
};

export type TarotCard = {
  id: number;
  name: string;
  nameEn: string;
  emoji: string;
  suit?: string;
  rank?: string;
  upright: CardMeaning;
  reversed: CardMeaning;
};

type RawMajorCard = {
  id: number;
  name: string;
  nameEn: string;
  emoji: string;
  upright: CardMeaning;
  reversed: CardMeaning;
};

type RawMinorCard = {
  rank: string;
  name: string;
  emoji: string;
  upright: CardMeaning;
  reversed: CardMeaning;
};

type RawSuit = {
  suit: string;
  suitEn: string;
  element: string;
  theme: string;
  cards: RawMinorCard[];
};

type RawData = {
  majorArcana: RawMajorCard[];
  minorArcana: {
    wands: RawSuit;
    cups: RawSuit;
    swords: RawSuit;
    pentacles: RawSuit;
  };
};

const data = parse(rawYaml) as RawData;

// Build full deck (78 cards)
const majorCards: TarotCard[] = data.majorArcana.map((card) => ({
  id: card.id,
  name: card.name,
  nameEn: card.nameEn,
  emoji: card.emoji,
  upright: card.upright,
  reversed: card.reversed,
}));

function buildMinorCards(suit: RawSuit, startId: number): TarotCard[] {
  return suit.cards.map((card, idx) => ({
    id: startId + idx,
    name: card.name,
    nameEn: `${card.rank.charAt(0).toUpperCase() + card.rank.slice(1)} of ${suit.suitEn}`,
    emoji: card.emoji,
    suit: suit.suit,
    rank: card.rank,
    upright: card.upright,
    reversed: card.reversed,
  }));
}

const wandsCards = buildMinorCards(data.minorArcana.wands, 22);
const cupsCards = buildMinorCards(data.minorArcana.cups, 36);
const swordsCards = buildMinorCards(data.minorArcana.swords, 50);
const pentaclesCards = buildMinorCards(data.minorArcana.pentacles, 64);

export const TAROT_DECK: TarotCard[] = [
  ...majorCards,
  ...wandsCards,
  ...cupsCards,
  ...swordsCards,
  ...pentaclesCards,
];

export const MAJOR_ARCANA = majorCards;
export const MINOR_ARCANA = [...wandsCards, ...cupsCards, ...swordsCards, ...pentaclesCards];
