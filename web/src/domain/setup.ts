import { CARDS } from '../data/cards'
import { NOBLES } from '../data/nobles'
import { STANDARD_TOKEN_COLORS, type CardId, type GameState, type PlayerId, type PlayerState, type Tier } from './model'
import { zeroBonusInventory, zeroTokenInventory } from './inventory'
import { shuffleWithSeed } from './random'

const PLAYER_DEFINITIONS: Array<{ id: PlayerId; name: string; isHuman: boolean }> = [
  { id: 'human', name: '玩家', isHuman: true },
  { id: 'ai-1', name: '小智', isHuman: false },
  { id: 'ai-2', name: '小霞', isHuman: false },
  { id: 'ai-3', name: '小刚', isHuman: false },
]

function createPlayer(id: PlayerId, name: string, isHuman: boolean): PlayerState {
  return {
    id,
    name,
    isHuman,
    tokens: zeroTokenInventory(),
    bonuses: zeroBonusInventory(),
    purchasedCards: [],
    reservedCards: [],
    nobles: [],
    points: 0,
  }
}

export function createInitialGame(seed: number): GameState {
  const market: Record<Tier, CardId[]> = { 1: [], 2: [], 3: [] }
  const decks: Record<Tier, CardId[]> = { 1: [], 2: [], 3: [] }
  let randomSeed = seed

  for (const tier of [1, 2, 3] as const) {
    const tierCardIds = CARDS
      .filter((card) => card.tier === tier)
      .map((card) => card.id)
    const shuffled = shuffleWithSeed(tierCardIds, randomSeed)

    randomSeed = shuffled.seed
    market[tier] = shuffled.items.slice(0, 4)
    decks[tier] = shuffled.items.slice(4)
  }

  const shuffledNobles = shuffleWithSeed(NOBLES.map((noble) => noble.id), randomSeed)
  randomSeed = shuffledNobles.seed

  const tokenBank = zeroTokenInventory()
  for (const color of STANDARD_TOKEN_COLORS) {
    tokenBank[color] = 7
  }
  tokenBank.rainbow = 5

  return {
    phase: 'playing',
    players: PLAYER_DEFINITIONS.map((player) => createPlayer(player.id, player.name, player.isHuman)),
    currentPlayerIndex: 0,
    decks,
    market,
    availableNobles: shuffledNobles.items.slice(0, 5),
    pendingNobleIds: [],
    pendingNoblePlayerId: null,
    tokenBank,
    round: 1,
    startingPlayerIndex: 0,
    finalRoundStartIndex: null,
    winnerIds: [],
    randomSeed,
    eventLog: [],
  }
}
