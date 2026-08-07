import { ASSET_PATHS } from '../data/assets'
import { CARDS } from '../data/cards'
import { NOBLES } from '../data/nobles'
import { ALL_TOKEN_COLORS, STANDARD_TOKEN_COLORS } from './model'
import { shuffleWithSeed } from './random'
import { createInitialGame } from './setup'

test('creates the standard four-player opening state', () => {
  const state = createInitialGame(123)

  expect(state.players).toHaveLength(4)
  expect(state.players.map((player) => player.id)).toEqual(['human', 'ai-1', 'ai-2', 'ai-3'])
  expect(state.market[1]).toHaveLength(4)
  expect(state.market[2]).toHaveLength(4)
  expect(state.market[3]).toHaveLength(4)
  expect(state.availableNobles).toHaveLength(5)
  for (const color of ALL_TOKEN_COLORS) {
    expect(state.tokenBank[color]).toBe(color === 'rainbow' ? 5 : 7)
  }
  expect(state.phase).toBe('playing')
  expect(state.finalRoundStartIndex).toBeNull()
  expect(state.pendingNobleIds).toEqual([])
  expect(state.pendingNoblePlayerId).toBeNull()
})

test('keeps each tier complete after dealing its four-card market', () => {
  const state = createInitialGame(123)
  const tierCounts = [
    [1, 40],
    [2, 30],
    [3, 20],
  ] as const

  for (const [tier, totalCount] of tierCounts) {
    const marketIds = state.market[tier]
    const deckIds = state.decks[tier]
    const fullTierIds = CARDS.filter((card) => card.tier === tier).map((card) => card.id)

    expect(marketIds).toHaveLength(4)
    expect(deckIds).toHaveLength(totalCount - 4)
    expect(marketIds.some((id) => deckIds.includes(id))).toBe(false)
    expect(new Set([...marketIds, ...deckIds])).toEqual(new Set(fullTierIds))
  }
})

test('initializes every player with empty inventories and no owned cards', () => {
  const state = createInitialGame(123)

  for (const player of state.players) {
    for (const color of ALL_TOKEN_COLORS) {
      expect(player.tokens[color]).toBe(0)
    }
    for (const color of STANDARD_TOKEN_COLORS) {
      expect(player.bonuses[color]).toBe(0)
    }
    expect(player.purchasedCards).toEqual([])
    expect(player.reservedCards).toEqual([])
    expect(player.nobles).toEqual([])
    expect(player.points).toBe(0)
  }
})

test('selects available nobles from the complete noble catalog', () => {
  const state = createInitialGame(123)
  const nobleIds = new Set(NOBLES.map((noble) => noble.id))

  expect(state.availableNobles.every((nobleId) => nobleIds.has(nobleId))).toBe(true)
})

test('contains the complete unique development-card catalog', () => {
  expect(CARDS).toHaveLength(90)
  expect(CARDS.filter((card) => card.tier === 1)).toHaveLength(40)
  expect(CARDS.filter((card) => card.tier === 2)).toHaveLength(30)
  expect(CARDS.filter((card) => card.tier === 3)).toHaveLength(20)
  expect(new Set(CARDS.map((card) => card.id)).size).toBe(CARDS.length)
})

test('contains the complete unique noble catalog with three points each', () => {
  expect(NOBLES).toHaveLength(10)
  expect(new Set(NOBLES.map((noble) => noble.id)).size).toBe(NOBLES.length)
  expect(NOBLES.every((noble) => noble.points === 3)).toBe(true)
})

test('provides an asset path for every card and noble image key', () => {
  for (const card of CARDS) {
    expect(ASSET_PATHS[card.imageKey]).toBeDefined()
  }

  for (const noble of NOBLES) {
    expect(ASSET_PATHS[noble.imageKey]).toBeDefined()
  }
})

test('uses the seed deterministically and changes the market for another seed', () => {
  const first = createInitialGame(123)
  const repeat = createInitialGame(123)
  const different = createInitialGame(456)

  expect(repeat.market).toEqual(first.market)
  expect(different.market).not.toEqual(first.market)
  expect(repeat.randomSeed).toBe(first.randomSeed)
  expect(different.randomSeed).not.toBe(first.randomSeed)
})

test('preserves the source-mapped Murkrow and Corsola costs', () => {
  const murkrow = CARDS.find((card) => card.name === 'Murkrow')
  const corsola = CARDS.find((card) => card.name === 'Corsola')

  expect(murkrow?.bonusType).toBe('grass')
  expect(murkrow?.cost).toEqual({ fire: 2, water: 0, grass: 2, electric: 3, psychic: 0 })
  expect(corsola?.bonusType).toBe('psychic')
  expect(corsola?.cost).toEqual({ fire: 0, water: 0, grass: 0, electric: 0, psychic: 5 })
})

test('shuffleWithSeed does not mutate its input array', () => {
  const input = ['a', 'b', 'c', 'd']
  const original = [...input]

  shuffleWithSeed(input, 123)

  expect(input).toEqual(original)
})
