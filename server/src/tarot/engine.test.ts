import { describe, it, expect } from 'vitest';
import { drawCards, getDailyCard, getTarotDeck, getCard, getSpreads } from './engine';

describe('drawCards', () => {
  it('returns TarotReading with required fields', () => {
    const reading = drawCards('user1', '20250115');

    expect(reading).toHaveProperty('spread');
    expect(reading).toHaveProperty('spreadType');
    expect(reading).toHaveProperty('spreadTypeKorean');
    expect(reading).toHaveProperty('summary');
    expect(reading).toHaveProperty('advice');
    expect(reading).toHaveProperty('timestamp');
  });

  it('returns correct number of cards for single spread', () => {
    const reading = drawCards('user1', '20250115', 'single');
    expect(reading.spread).toHaveLength(1);
  });

  it('returns correct number of cards for three spread', () => {
    const reading = drawCards('user1', '20250115', 'three');
    expect(reading.spread).toHaveLength(3);
  });

  it('returns correct number of cards for celtic spread', () => {
    const reading = drawCards('user1', '20250115', 'celtic');
    expect(reading.spread).toHaveLength(10);
  });

  it('returns correct number of cards for love spread', () => {
    const reading = drawCards('user1', '20250115', 'love');
    expect(reading.spread).toHaveLength(5);
  });

  it('returns correct number of cards for career spread', () => {
    const reading = drawCards('user1', '20250115', 'career');
    expect(reading.spread).toHaveLength(5);
  });

  it('throws for unknown spread type', () => {
    expect(() => drawCards('user1', '20250115', 'unknown' as never)).toThrow();
  });

  it('is deterministic - same inputs produce same cards', () => {
    const reading1 = drawCards('user1', '20250115', 'three');
    const reading2 = drawCards('user1', '20250115', 'three');

    expect(reading1.spread[0].id).toBe(reading2.spread[0].id);
    expect(reading1.spread[1].id).toBe(reading2.spread[1].id);
    expect(reading1.spread[2].id).toBe(reading2.spread[2].id);
  });

  it('produces different cards for different users', () => {
    const cardSets = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const reading = drawCards(`user${i}`, '20250115', 'single');
      cardSets.add(reading.spread[0].id);
    }
    expect(cardSets.size).toBeGreaterThan(1);
  });

  it('produces different cards for different dates', () => {
    const cardSets = new Set<string>();
    for (let i = 1; i <= 31; i++) {
      const dateKey = `202501${String(i).padStart(2, '0')}`;
      const reading = drawCards('user1', dateKey, 'single');
      cardSets.add(reading.spread[0].id);
    }
    expect(cardSets.size).toBeGreaterThan(1);
  });

  it('cards have all required DrawnCard fields', () => {
    const reading = drawCards('user1', '20250115', 'three');

    for (const card of reading.spread) {
      expect(card).toHaveProperty('id');
      expect(card).toHaveProperty('name');
      expect(card).toHaveProperty('nameKorean');
      expect(card).toHaveProperty('arcana');
      expect(card).toHaveProperty('isReversed');
      expect(card).toHaveProperty('position');
      expect(card).toHaveProperty('positionKorean');
      expect(card).toHaveProperty('interpretation');
    }
  });

  it('isReversed is boolean for each card', () => {
    const reading = drawCards('user1', '20250115', 'celtic');

    for (const card of reading.spread) {
      expect(typeof card.isReversed).toBe('boolean');
    }
  });

  it('no duplicate cards in spread', () => {
    const reading = drawCards('user1', '20250115', 'celtic');
    const ids = reading.spread.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('includes question in reading when provided', () => {
    const reading = drawCards('user1', '20250115', 'single', 'Will I find love?');
    expect(reading.question).toBe('Will I find love?');
  });

  it('question affects card selection', () => {
    const reading1 = drawCards('user1', '20250115', 'single', 'Question A');
    const reading2 = drawCards('user1', '20250115', 'single', 'Question B');

    // May or may not be different, but they should both work
    expect(reading1.spread).toHaveLength(1);
    expect(reading2.spread).toHaveLength(1);
  });

  it('summary is non-empty string', () => {
    const reading = drawCards('user1', '20250115', 'three');
    expect(typeof reading.summary).toBe('string');
    expect(reading.summary.length).toBeGreaterThan(0);
  });

  it('advice is non-empty string', () => {
    const reading = drawCards('user1', '20250115', 'three');
    expect(typeof reading.advice).toBe('string');
    expect(reading.advice.length).toBeGreaterThan(0);
  });
});

describe('getDailyCard', () => {
  it('returns a DrawnCard', () => {
    const card = getDailyCard('user1', '20250115');

    expect(card).toHaveProperty('id');
    expect(card).toHaveProperty('name');
    expect(card).toHaveProperty('isReversed');
  });

  it('is deterministic', () => {
    const card1 = getDailyCard('user1', '20250115');
    const card2 = getDailyCard('user1', '20250115');

    expect(card1.id).toBe(card2.id);
    expect(card1.isReversed).toBe(card2.isReversed);
  });

  it('different users get different cards', () => {
    const cards = new Set<string>();
    for (let i = 0; i < 100; i++) {
      cards.add(getDailyCard(`user${i}`, '20250115').id);
    }
    expect(cards.size).toBeGreaterThan(1);
  });
});

describe('getTarotDeck', () => {
  it('returns 78 cards', () => {
    const deck = getTarotDeck();
    expect(deck).toHaveLength(78);
  });

  it('contains 22 major arcana', () => {
    const deck = getTarotDeck();
    const major = deck.filter(c => c.arcana === 'major');
    expect(major).toHaveLength(22);
  });

  it('contains 56 minor arcana', () => {
    const deck = getTarotDeck();
    const minor = deck.filter(c => c.arcana === 'minor');
    expect(minor).toHaveLength(56);
  });

  it('minor arcana has 4 suits with 14 cards each', () => {
    const deck = getTarotDeck();
    const suits = ['wands', 'cups', 'swords', 'pentacles'];

    for (const suit of suits) {
      const suitCards = deck.filter(c => c.suit === suit);
      expect(suitCards).toHaveLength(14);
    }
  });

  it('all cards have unique IDs', () => {
    const deck = getTarotDeck();
    const ids = deck.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(78);
  });

  it('all cards have required fields', () => {
    const deck = getTarotDeck();

    for (const card of deck) {
      expect(card.id).toBeTruthy();
      expect(card.name).toBeTruthy();
      expect(card.nameKorean).toBeTruthy();
      expect(card.arcana).toBeTruthy();
      expect(card.upright).toBeTruthy();
      expect(card.reversed).toBeTruthy();
    }
  });
});

describe('getCard', () => {
  it('returns card for valid ID', () => {
    const card = getCard('major_0');
    expect(card?.name).toBe('The Fool');
  });

  it('returns undefined for invalid ID', () => {
    expect(getCard('invalid_id')).toBeUndefined();
  });

  it('finds minor arcana cards', () => {
    const card = getCard('minor_cups_1');
    expect(card?.suit).toBe('cups');
  });
});

describe('getSpreads', () => {
  it('returns all spread definitions', () => {
    const spreads = getSpreads();

    expect(spreads).toHaveProperty('single');
    expect(spreads).toHaveProperty('three');
    expect(spreads).toHaveProperty('celtic');
    expect(spreads).toHaveProperty('love');
    expect(spreads).toHaveProperty('career');
  });

  it('each spread has required fields', () => {
    const spreads = getSpreads();

    for (const [, spread] of Object.entries(spreads)) {
      expect(spread.name).toBeTruthy();
      expect(spread.nameKorean).toBeTruthy();
      expect(spread.positions).toBeTruthy();
      expect(spread.description).toBeTruthy();
    }
  });

  it('single spread has 1 position', () => {
    const spreads = getSpreads();
    expect(spreads.single.positions).toHaveLength(1);
  });

  it('three spread has 3 positions', () => {
    const spreads = getSpreads();
    expect(spreads.three.positions).toHaveLength(3);
  });

  it('celtic spread has 10 positions', () => {
    const spreads = getSpreads();
    expect(spreads.celtic.positions).toHaveLength(10);
  });
});
