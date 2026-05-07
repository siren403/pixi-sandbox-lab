export type BalatroSuit = "clubs" | "diamonds" | "hearts" | "spades";

export type BalatroRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | "J" | "Q" | "K" | "A";

export type BalatroCard = {
  id: string;
  suit: BalatroSuit;
  rank: BalatroRank;
};

export type BalatroHandCategory =
  | "high-card"
  | "pair"
  | "two-pair"
  | "three-of-a-kind"
  | "straight"
  | "flush"
  | "full-house"
  | "four-of-a-kind"
  | "straight-flush";

export type BalatroLitePhase = "select" | "result";

export type BalatroScoreBreakdown = {
  category: BalatroHandCategory;
  playedCardIds: string[];
  scoringCardIds: string[];
  baseChips: number;
  rankChips: number;
  mult: number;
  total: number;
  straightIsAceLow: boolean;
};

export type BalatroLiteGameState = {
  seed: number;
  round: number;
  phase: BalatroLitePhase;
  deck: BalatroCard[];
  hand: BalatroCard[];
  selectedCardIds: string[];
  lastScore?: BalatroScoreBreakdown;
  cumulativeScore: number;
  lastCategory: BalatroHandCategory | "none";
};

export type BalatroHandEvaluation = BalatroScoreBreakdown;

const suits: BalatroSuit[] = ["clubs", "diamonds", "hearts", "spades"];
const ranks: BalatroRank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
const handLevels: Record<BalatroHandCategory, { chips: number; mult: number }> = {
  "high-card": { chips: 5, mult: 1 },
  pair: { chips: 10, mult: 2 },
  "two-pair": { chips: 20, mult: 2 },
  "three-of-a-kind": { chips: 30, mult: 3 },
  straight: { chips: 30, mult: 4 },
  flush: { chips: 35, mult: 4 },
  "full-house": { chips: 40, mult: 4 },
  "four-of-a-kind": { chips: 60, mult: 7 },
  "straight-flush": { chips: 100, mult: 8 },
};

export function createBalancedDeck(): BalatroCard[] {
  const cards: BalatroCard[] = [];
  let index = 0;
  for (const suit of suits) {
    for (const rank of ranks) {
      cards.push({
        id: `card-${String(++index).padStart(2, "0")}`,
        suit,
        rank,
      });
    }
  }
  return cards;
}

export function shuffleDeck(seed: number, cards: BalatroCard[]): BalatroCard[] {
  const shuffled = cards.slice();
  const random = createRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function createGame(seed: number): BalatroLiteGameState {
  return dealNextRound({
    seed,
    round: 0,
    phase: "select",
    deck: [],
    hand: [],
    selectedCardIds: [],
    lastScore: undefined,
    cumulativeScore: 0,
    lastCategory: "none",
  });
}

export function toggleCardSelection(state: BalatroLiteGameState, cardId: string): BalatroLiteGameState {
  if (state.phase !== "select") return state;
  if (!state.hand.some((card) => card.id === cardId)) return state;

  const isSelected = state.selectedCardIds.includes(cardId);
  const selectedCardIds = isSelected
    ? state.selectedCardIds.filter((id) => id !== cardId)
    : state.selectedCardIds.length >= 5
      ? state.selectedCardIds
      : [...state.selectedCardIds, cardId];

  return {
    ...state,
    selectedCardIds,
  };
}

export function canPlayHand(state: BalatroLiteGameState): boolean {
  return state.phase === "select" && state.selectedCardIds.length > 0 && state.selectedCardIds.length <= 5;
}

export function canAdvanceRound(state: BalatroLiteGameState): boolean {
  return state.phase === "result" && state.deck.length > 0;
}

export function playSelectedHand(state: BalatroLiteGameState): BalatroLiteGameState {
  if (!canPlayHand(state)) return state;

  const selectedCards = state.hand.filter((card) => state.selectedCardIds.includes(card.id));
  const evaluation = evaluateHand(selectedCards);
  return {
    ...state,
    phase: "result",
    lastScore: evaluation,
    cumulativeScore: state.cumulativeScore + evaluation.total,
    lastCategory: evaluation.category,
    selectedCardIds: [],
  };
}

export function dealNextRound(state: BalatroLiteGameState): BalatroLiteGameState {
  if (state.phase !== "result" && state.round > 0) return state;

  const nextRound = state.round + 1;
  const roundDeck = shuffleDeck(state.seed + nextRound * 9973, createBalancedDeck());
  const handSize = 8;
  const hand = roundDeck.slice(0, handSize);
  const deck = roundDeck.slice(handSize);

  return {
    ...state,
    round: nextRound,
    phase: "select",
    deck,
    hand,
    selectedCardIds: [],
  };
}

export function evaluateHand(cards: BalatroCard[]): BalatroHandEvaluation {
  if (cards.length === 0) {
    return {
      category: "high-card",
      playedCardIds: [],
      scoringCardIds: [],
      baseChips: 0,
      rankChips: 0,
      mult: 1,
      total: 0,
      straightIsAceLow: false,
    };
  }

  const countsByRank = new Map<BalatroRank, BalatroCard[]>();
  for (const card of cards) {
    const cardsForRank = countsByRank.get(card.rank) ?? [];
    cardsForRank.push(card);
    countsByRank.set(card.rank, cardsForRank);
  }

  const sortedByValue = cards.slice().sort((left, right) => rankValue(right.rank) - rankValue(left.rank));
  const isFlush = cards.every((card) => card.suit === cards[0].suit) && cards.length === 5;
  const straightInfo = getStraightInfo(cards);
  const groups = Array.from(countsByRank.values()).sort((left, right) => {
    const countDifference = right.length - left.length;
    return countDifference !== 0 ? countDifference : rankValue(right[0].rank) - rankValue(left[0].rank);
  });

  const groupSizes = groups.map((group) => group.length).sort((left, right) => right - left);
  const hasPair = groupSizes[0] >= 2;
  const hasTwoPair = groupSizes.filter((size) => size >= 2).length >= 2;
  const hasTrips = groupSizes[0] >= 3;
  const hasQuads = groupSizes[0] >= 4;
  const hasFullHouse = groupSizes.includes(3) && groupSizes.includes(2);

  if (straightInfo.isStraight && isFlush) {
    return scoreHand("straight-flush", straightInfo.scoringCards, straightInfo.straightIsAceLow, cards);
  }
  if (hasQuads) {
    const scoringCards = groups[0];
    return scoreHand("four-of-a-kind", scoringCards, false, cards);
  }
  if (hasFullHouse) {
    const scoringCards = [...groups.find((group) => group.length === 3)!, ...groups.find((group) => group.length === 2)!];
    return scoreHand("full-house", scoringCards, false, cards);
  }
  if (isFlush) {
    return scoreHand("flush", cards, false, cards);
  }
  if (straightInfo.isStraight) {
    return scoreHand("straight", straightInfo.scoringCards, straightInfo.straightIsAceLow, cards);
  }
  if (hasTrips) {
    return scoreHand("three-of-a-kind", groups[0], false, cards);
  }
  if (hasTwoPair) {
    const pairGroups = groups.filter((group) => group.length >= 2).slice(0, 2);
    return scoreHand("two-pair", pairGroups.flatMap((group) => group.slice(0, 2)), false, cards);
  }
  if (hasPair) {
    return scoreHand("pair", groups[0].slice(0, 2), false, cards);
  }
  return scoreHand("high-card", [sortedByValue[0]], false, cards);
}

export function formatCardLabel(card: BalatroCard): string {
  return `${rankLabel(card.rank)}${suitSymbol(card.suit)}`;
}

export function rankLabel(rank: BalatroRank): string {
  return String(rank);
}

export function suitSymbol(suit: BalatroSuit): string {
  if (suit === "clubs") return "♣";
  if (suit === "diamonds") return "♦";
  if (suit === "hearts") return "♥";
  return "♠";
}

export function rankValue(rank: BalatroRank): number {
  if (typeof rank === "number") return rank;
  if (rank === "J") return 11;
  if (rank === "Q") return 12;
  if (rank === "K") return 13;
  return 14;
}

function scoreHand(
  category: BalatroHandCategory,
  scoringCards: BalatroCard[],
  straightIsAceLow: boolean,
  playedCards: BalatroCard[] = scoringCards,
): BalatroHandEvaluation {
  const level = handLevels[category];
  const rankChipsTotal = scoringCards.reduce((total, card) => total + rankChips(card.rank), 0);
  return {
    category,
    playedCardIds: playedCards.map((card) => card.id),
    scoringCardIds: scoringCards.map((card) => card.id),
    baseChips: level.chips,
    rankChips: rankChipsTotal,
    mult: level.mult,
    total: (level.chips + rankChipsTotal) * level.mult,
    straightIsAceLow,
  };
}

function rankChips(rank: BalatroRank): number {
  if (typeof rank === "number") return rank;
  if (rank === "A") return 11;
  return 10;
}

function getStraightInfo(cards: BalatroCard[]): { isStraight: boolean; straightIsAceLow: boolean; scoringCards: BalatroCard[] } {
  if (cards.length !== 5) {
    return { isStraight: false, straightIsAceLow: false, scoringCards: [] };
  }

  const sorted = cards.slice().sort((left, right) => rankValue(left.rank) - rankValue(right.rank));
  const values = sorted.map((card) => rankValue(card.rank));
  const uniqueValues = new Set(values);
  if (uniqueValues.size !== 5) {
    return { isStraight: false, straightIsAceLow: false, scoringCards: [] };
  }

  const isSequential = values.every((value, index) => index === 0 || value === values[index - 1] + 1);
  if (isSequential) {
    return { isStraight: true, straightIsAceLow: false, scoringCards: sorted };
  }

  const aceLowValues = values.map((value) => (value === 14 ? 1 : value)).sort((left, right) => left - right);
  const aceLowSequential = aceLowValues.every((value, index) => index === 0 || value === aceLowValues[index - 1] + 1);
  if (aceLowSequential && aceLowValues[0] === 1 && aceLowValues[aceLowValues.length - 1] === 5) {
    return {
      isStraight: true,
      straightIsAceLow: true,
      scoringCards: sorted,
    };
  }

  return { isStraight: false, straightIsAceLow: false, scoringCards: [] };
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  if (state === 0) state = 0x6d2b79f5;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}
