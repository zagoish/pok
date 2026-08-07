import { CARDS } from '../data/cards'
import { applyAction } from './action-apply'
import { getLegalActions, validateAction } from './action-legality'
import { totalTokens, zeroTokenInventory } from './inventory'
import type { Action, CardId, GameState, RuleResult, Tier } from './model'
import { createInitialGame } from './setup'

const BULBASAUR = 'tier-1-001'
const CHARMANDER = 'tier-1-002'
const EEVEE = 'tier-1-005'
const VULPIX = 'tier-1-006'
const TOTODILE = 'tier-2-001'
const CROCONAW = 'tier-2-002'
const FERALIGATR = 'tier-2-003'

function withTier(
  state: GameState,
  tier: Tier,
  market: CardId[],
  deck: CardId[] = state.decks[tier],
): GameState {
  return {
    ...state,
    market: { ...state.market, [tier]: [...market] },
    decks: { ...state.decks, [tier]: [...deck] },
  }
}

function withBank(state: GameState, changes: Partial<GameState['tokenBank']>): GameState {
  return {
    ...state,
    tokenBank: { ...state.tokenBank, ...changes },
  }
}

function withHuman(
  state: GameState,
  changes: {
    tokens?: Partial<GameState['players'][number]['tokens']>
    bonuses?: Partial<GameState['players'][number]['bonuses']>
    reservedCards?: CardId[]
  },
): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === 0
        ? {
            ...player,
            tokens: { ...player.tokens, ...changes.tokens },
            bonuses: { ...player.bonuses, ...changes.bonuses },
            reservedCards: changes.reservedCards
              ? [...changes.reservedCards]
              : [...player.reservedCards],
          }
        : player,
    ),
  }
}

function expectRuleError<T>(result: RuleResult<T>, code: string): void {
  expect(result).toEqual({
    ok: false,
    error: {
      code,
      message: expect.any(String),
    },
  })
}

function cardName(cardId: CardId): string {
  const card = CARDS.find((candidate) => candidate.id === cardId)
  if (!card) throw new Error(`Unknown test card: ${cardId}`)
  return card.name
}

test('rejects buying a card that is not visible in the market', () => {
  const state = withTier(createInitialGame(123), 1, [BULBASAUR], [])
  const action: Action = {
    type: 'buy-card',
    playerId: 'human',
    cardId: CHARMANDER,
    source: 'market',
  }

  expectRuleError(validateAction(state, action), 'CARD_NOT_AVAILABLE')
})

test('rejects buying a reserved card that is not reserved by the acting player', () => {
  const state = withTier(createInitialGame(123), 1, [BULBASAUR], [])
  const action: Action = {
    type: 'buy-card',
    playerId: 'human',
    cardId: CHARMANDER,
    source: 'reserved',
  }

  expectRuleError(validateAction(state, action), 'CARD_NOT_AVAILABLE')
})

test('rejects a visible card the player cannot afford', () => {
  const state = withTier(createInitialGame(123), 3, ['tier-3-001'], [])
  const action: Action = {
    type: 'buy-card',
    playerId: 'human',
    cardId: 'tier-3-001',
    source: 'market',
  }

  expectRuleError(validateAction(state, action), 'CANNOT_AFFORD')
})

test('rejects reserving a visible card when the player already has three reservations', () => {
  const state = withHuman(
    withTier(createInitialGame(123), 1, [BULBASAUR], []),
    { reservedCards: [CHARMANDER, EEVEE, VULPIX] },
  )
  const action: Action = {
    type: 'reserve-card',
    playerId: 'human',
    cardId: BULBASAUR,
    tier: 1,
  }

  expectRuleError(validateAction(state, action), 'RESERVE_LIMIT')
})

test('buys with permanent discounts, spends rainbow tokens for deficits, and returns spent tokens', () => {
  const state = withBank(
    withHuman(withTier(createInitialGame(123), 1, [EEVEE], []), {
      tokens: { grass: 2, rainbow: 1 },
      bonuses: { grass: 1 },
    }),
    { grass: 5, rainbow: 4 },
  )
  const original = structuredClone(state)
  const action: Action = {
    type: 'buy-card',
    playerId: 'human',
    cardId: EEVEE,
    source: 'market',
  }

  const result = applyAction(state, action)

  expect(result.ok).toBe(true)
  if (!result.ok) return

  const next = result.value
  expect(state).toEqual(original)
  expect(next).not.toBe(state)
  expect(next.players).not.toBe(state.players)
  expect(next.players[0]).not.toBe(state.players[0])
  expect(next.players[0].tokens).not.toBe(state.players[0].tokens)
  expect(next.players[0].bonuses).not.toBe(state.players[0].bonuses)
  expect(next.players[0].purchasedCards).not.toBe(state.players[0].purchasedCards)
  expect(next.market).not.toBe(state.market)
  expect(next.market[1]).not.toBe(state.market[1])
  expect(next.decks).not.toBe(state.decks)
  expect(next.tokenBank).not.toBe(state.tokenBank)

  expect(next.players[0].tokens).toEqual(zeroTokenInventory())
  expect(next.tokenBank.grass).toBe(7)
  expect(next.tokenBank.rainbow).toBe(5)
  expect(next.players[0].points).toBe(1)
  expect(next.players[0].bonuses.electric).toBe(1)
  expect(next.players[0].purchasedCards).toEqual([EEVEE])
  expect(next.market[1]).toEqual([])
  expect(next.currentPlayerIndex).toBe(1)
  expect(next.eventLog.at(-1)).toEqual({
    type: 'buy-card',
    playerId: 'human',
    message: expect.stringContaining(cardName(EEVEE)),
  })
})

test('buys a reserved card without refilling its market tier', () => {
  const state = withBank(
    withHuman(
      withTier(createInitialGame(123), 1, [BULBASAUR], [VULPIX]),
      { tokens: { grass: 4 }, reservedCards: [EEVEE] },
    ),
    { grass: 3 },
  )
  const action: Action = {
    type: 'buy-card',
    playerId: 'human',
    cardId: EEVEE,
    source: 'reserved',
  }

  const result = applyAction(state, action)

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.value.players[0].reservedCards).toEqual([])
  expect(result.value.players[0].purchasedCards).toEqual([EEVEE])
  expect(result.value.players[0].points).toBe(1)
  expect(result.value.market[1]).toEqual([BULBASAUR])
  expect(result.value.decks[1]).toEqual([VULPIX])
  expect(result.value.tokenBank.grass).toBe(7)
  expect(result.value.currentPlayerIndex).toBe(1)
})

test('buys a market card and draws the first replacement from the same tier deck', () => {
  const state = withBank(
    withHuman(
      withTier(createInitialGame(123), 1, [BULBASAUR, CHARMANDER], [EEVEE]),
      { tokens: { water: 3 } },
    ),
    { water: 4 },
  )
  const action: Action = {
    type: 'buy-card',
    playerId: 'human',
    cardId: BULBASAUR,
    source: 'market',
  }

  const result = applyAction(state, action)

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.value.market[1]).toEqual([CHARMANDER, EEVEE])
  expect(result.value.decks[1]).toEqual([])
  expect(result.value.players[0].purchasedCards).toEqual([BULBASAUR])
  expect(result.value.currentPlayerIndex).toBe(1)
})

test('reserves a market card, takes a rainbow token, and refills the same tier', () => {
  const state = withTier(createInitialGame(123), 2, [TOTODILE, CROCONAW], [FERALIGATR])
  const action: Action = {
    type: 'reserve-card',
    playerId: 'human',
    cardId: TOTODILE,
    tier: 2,
  }

  const result = applyAction(state, action)

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.value.players[0].reservedCards).toEqual([TOTODILE])
  expect(result.value.players[0].tokens.rainbow).toBe(1)
  expect(result.value.tokenBank.rainbow).toBe(4)
  expect(result.value.market[2]).toEqual([CROCONAW, FERALIGATR])
  expect(result.value.decks[2]).toEqual([])
  expect(result.value.currentPlayerIndex).toBe(1)
  expect(result.value.eventLog.at(-1)).toEqual({
    type: 'reserve-card',
    playerId: 'human',
    message: expect.stringContaining(cardName(TOTODILE)),
  })
})

test('allows a reservation that raises nine tokens to exactly ten', () => {
  const state = withHuman(
    withTier(createInitialGame(123), 1, [BULBASAUR], []),
    { tokens: { fire: 9 } },
  )
  const action: Action = {
    type: 'reserve-card',
    playerId: 'human',
    cardId: BULBASAUR,
    tier: 1,
  }

  const result = applyAction(state, action)

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(totalTokens(result.value.players[0].tokens)).toBe(10)
  expect(result.value.players[0].tokens.rainbow).toBe(1)
  expect(result.value.tokenBank.rainbow).toBe(4)
})

test('reserves a market card even when the rainbow bank is empty', () => {
  const state = withBank(
    withTier(createInitialGame(123), 1, [BULBASAUR], [CHARMANDER]),
    { rainbow: 0 },
  )
  const action: Action = {
    type: 'reserve-card',
    playerId: 'human',
    cardId: BULBASAUR,
    tier: 1,
  }

  expect(validateAction(state, action)).toEqual({ ok: true, value: undefined })

  const result = applyAction(state, action)

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.value.players[0].reservedCards).toEqual([BULBASAUR])
  expect(result.value.players[0].tokens.rainbow).toBe(0)
  expect(result.value.tokenBank.rainbow).toBe(0)
  expect(result.value.market[1]).toEqual([CHARMANDER])
  expect(result.value.decks[1]).toEqual([])
})

test('enumerates affordable buy and reserve actions while preserving token actions', () => {
  const state = withBank(
    withHuman(withTier(createInitialGame(123), 1, [BULBASAUR], []), {
      tokens: { water: 3 },
    }),
    { water: 4 },
  )

  const actions = getLegalActions(state, 'human')

  expect(actions).toContainEqual({
    type: 'buy-card',
    playerId: 'human',
    cardId: BULBASAUR,
    source: 'market',
  })
  expect(actions).toContainEqual({
    type: 'reserve-card',
    playerId: 'human',
    cardId: BULBASAUR,
    tier: 1,
  })
  expect(actions).toContainEqual({
    type: 'take-three-different',
    playerId: 'human',
    colors: ['fire', 'water', 'grass'],
  })
  expect(actions).toContainEqual({
    type: 'take-two-same',
    playerId: 'human',
    color: 'fire',
  })
})

test('does not mutate the input state or nested collections when reserving', () => {
  const state = withTier(createInitialGame(123), 1, [BULBASAUR], [])
  const original = structuredClone(state)
  const action: Action = {
    type: 'reserve-card',
    playerId: 'human',
    cardId: BULBASAUR,
    tier: 1,
  }

  const result = applyAction(state, action)

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(state).toEqual(original)
  expect(result.value.players[0].reservedCards).not.toBe(state.players[0].reservedCards)
  expect(result.value.market[1]).not.toBe(state.market[1])
  expect(result.value.decks[1]).not.toBe(state.decks[1])
  expect(result.value.eventLog).not.toBe(state.eventLog)
})

test('does not mutate the input state when a purchase fails validation', () => {
  const state = withTier(createInitialGame(123), 1, [BULBASAUR], [])
  const original = structuredClone(state)
  const action: Action = {
    type: 'buy-card',
    playerId: 'human',
    cardId: CHARMANDER,
    source: 'market',
  }

  const result = applyAction(state, action)

  expectRuleError(result, 'CARD_NOT_AVAILABLE')
  expect(state).toEqual(original)
  expect(state.players[0].tokens).toEqual(zeroTokenInventory())
})
