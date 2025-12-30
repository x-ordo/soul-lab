import { describe, it, expect, vi, beforeEach } from 'vitest';
import { drawThreeCardSpread, drawDailyCard, DrawnCard, TarotReading } from './tarot';
import { TAROT_DECK } from '../data/tarotCards';

// Mock dependencies
vi.mock('./seed', () => ({
  todayKey: vi.fn(() => '20250115'),
}));

vi.mock('./storage', () => ({
  getBirthDate: vi.fn(() => '19950315'),
}));

describe('drawThreeCardSpread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a TarotReading object with all required fields', () => {
    const reading = drawThreeCardSpread('user123');

    expect(reading).toHaveProperty('cards');
    expect(reading).toHaveProperty('readingDate');
    expect(reading).toHaveProperty('summary');
  });

  it('returns exactly 3 cards', () => {
    const reading = drawThreeCardSpread('user123');
    expect(reading.cards).toHaveLength(3);
  });

  it('returns no duplicate cards', () => {
    const reading = drawThreeCardSpread('user123');
    const cardIds = reading.cards.map((c) => c.card.id);
    const uniqueIds = new Set(cardIds);
    expect(uniqueIds.size).toBe(3);
  });

  it('is deterministic - same user returns same cards', () => {
    const reading1 = drawThreeCardSpread('user123');
    const reading2 = drawThreeCardSpread('user123');

    expect(reading1.cards[0].card.id).toBe(reading2.cards[0].card.id);
    expect(reading1.cards[1].card.id).toBe(reading2.cards[1].card.id);
    expect(reading1.cards[2].card.id).toBe(reading2.cards[2].card.id);
  });

  it('cards have correct positions (past, present, future)', () => {
    const reading = drawThreeCardSpread('user123');

    expect(reading.cards[0].position).toBe('past');
    expect(reading.cards[1].position).toBe('present');
    expect(reading.cards[2].position).toBe('future');
  });

  it('cards have correct position labels', () => {
    const reading = drawThreeCardSpread('user123');

    expect(reading.cards[0].positionLabel).toBe('🌙 과거');
    expect(reading.cards[1].positionLabel).toBe('☀️ 현재');
    expect(reading.cards[2].positionLabel).toBe('⭐ 미래');
  });

  it('each card has valid card data', () => {
    const reading = drawThreeCardSpread('user123');

    for (const drawn of reading.cards) {
      expect(drawn.card).toHaveProperty('id');
      expect(drawn.card).toHaveProperty('name');
      expect(drawn.card).toHaveProperty('nameEn');
      expect(drawn.card).toHaveProperty('upright');
      expect(drawn.card).toHaveProperty('reversed');
    }
  });

  it('isReversed is a boolean for each card', () => {
    const reading = drawThreeCardSpread('user123');

    for (const drawn of reading.cards) {
      expect(typeof drawn.isReversed).toBe('boolean');
    }
  });

  it('readingDate is the mocked date', () => {
    const reading = drawThreeCardSpread('user123');
    expect(reading.readingDate).toBe('20250115');
  });

  it('summary is a non-empty string', () => {
    const reading = drawThreeCardSpread('user123');
    expect(typeof reading.summary).toBe('string');
    expect(reading.summary.length).toBeGreaterThan(0);
  });

  it('summary contains keywords from all three cards', () => {
    const reading = drawThreeCardSpread('user123');
    // Summary should contain 과거, 현재, 미래 keywords
    expect(reading.summary).toContain('과거');
    expect(reading.summary).toContain('현재');
    expect(reading.summary).toContain('미래');
  });

  it('returns different cards for different users', () => {
    const cardSets = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const reading = drawThreeCardSpread(`user${i}`);
      cardSets.add(reading.cards.map((c) => c.card.id).join(','));
    }
    // Should have variety
    expect(cardSets.size).toBeGreaterThan(1);
  });

  it('all card indices are within bounds [0, 77]', () => {
    // Run multiple times to ensure indices are always valid
    for (let i = 0; i < 100; i++) {
      const reading = drawThreeCardSpread(`user${i}`);
      for (const drawn of reading.cards) {
        const cardIndex = TAROT_DECK.findIndex((c) => c.id === drawn.card.id);
        expect(cardIndex).toBeGreaterThanOrEqual(0);
        expect(cardIndex).toBeLessThan(78);
      }
    }
  });

  it('reversal rate is approximately 33%', () => {
    let reversedCount = 0;
    let totalCards = 0;

    for (let i = 0; i < 300; i++) {
      const reading = drawThreeCardSpread(`testuser${i}`);
      for (const drawn of reading.cards) {
        totalCards++;
        if (drawn.isReversed) reversedCount++;
      }
    }

    const reversalRate = reversedCount / totalCards;
    // Should be approximately 33% (with some tolerance)
    expect(reversalRate).toBeGreaterThan(0.25);
    expect(reversalRate).toBeLessThan(0.42);
  });
});

describe('drawDailyCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a DrawnCard object with all required fields', () => {
    const card = drawDailyCard('user123');

    expect(card).toHaveProperty('card');
    expect(card).toHaveProperty('isReversed');
    expect(card).toHaveProperty('position');
    expect(card).toHaveProperty('positionLabel');
  });

  it('returns valid card data', () => {
    const card = drawDailyCard('user123');

    expect(card.card).toHaveProperty('id');
    expect(card.card).toHaveProperty('name');
    expect(card.card).toHaveProperty('nameEn');
    expect(card.card).toHaveProperty('upright');
    expect(card.card).toHaveProperty('reversed');
  });

  it('is deterministic - same user returns same card', () => {
    const card1 = drawDailyCard('user123');
    const card2 = drawDailyCard('user123');

    expect(card1.card.id).toBe(card2.card.id);
    expect(card1.isReversed).toBe(card2.isReversed);
  });

  it('position is present', () => {
    const card = drawDailyCard('user123');
    expect(card.position).toBe('present');
  });

  it('positionLabel is correct', () => {
    const card = drawDailyCard('user123');
    expect(card.positionLabel).toBe('✨ 오늘의 카드');
  });

  it('isReversed is a boolean', () => {
    const card = drawDailyCard('user123');
    expect(typeof card.isReversed).toBe('boolean');
  });

  it('returns different cards for different users', () => {
    const cards = new Set<number>();
    for (let i = 0; i < 100; i++) {
      cards.add(drawDailyCard(`user${i}`).card.id);
    }
    // Should have variety
    expect(cards.size).toBeGreaterThan(1);
  });

  it('card index is within bounds [0, 77]', () => {
    for (let i = 0; i < 100; i++) {
      const card = drawDailyCard(`user${i}`);
      const cardIndex = TAROT_DECK.findIndex((c) => c.id === card.card.id);
      expect(cardIndex).toBeGreaterThanOrEqual(0);
      expect(cardIndex).toBeLessThan(78);
    }
  });

  it('card is from the TAROT_DECK', () => {
    const card = drawDailyCard('user123');
    const found = TAROT_DECK.find((c) => c.id === card.card.id);
    expect(found).toBeDefined();
  });

  it('reversal rate is approximately 33%', () => {
    let reversedCount = 0;

    for (let i = 0; i < 1000; i++) {
      const card = drawDailyCard(`dailyuser${i}`);
      if (card.isReversed) reversedCount++;
    }

    const reversalRate = reversedCount / 1000;
    // Should be approximately 33% (with some tolerance)
    expect(reversalRate).toBeGreaterThan(0.25);
    expect(reversalRate).toBeLessThan(0.42);
  });

  it('different users get different daily cards', () => {
    const dailyCards = new Set<number>();
    for (let i = 0; i < 78; i++) {
      dailyCards.add(drawDailyCard(`uniqueuser${i}`).card.id);
    }
    // Should cover a good portion of the deck
    expect(dailyCards.size).toBeGreaterThan(20);
  });
});
