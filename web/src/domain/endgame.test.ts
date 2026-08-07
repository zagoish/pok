import { applyAction } from './action-apply'
import { getLegalActions, validateAction } from './action-legality'
import { claimNoble, getEligibleNobles } from './nobles'
import { checkGameEnd } from './endgame'
import { nextRandom } from './random'
import { createInitialGame } from './setup'
import type { Action, CardId, GameState, NobleId, PlayerId, RuleResult, Tier } from './model'

const BULBASAUR = 'tier-1-001'
const EEVEE = 'tier-1-005'

function withMarket(state: GameState, tier: Tier, market: CardId[], deck: CardId[] = []): GameState {
  return {
    ...state,
    market: { ...state.market, [tier]: [...market] },
    decks: { ...state.decks, [tier]: [...deck] },
  }
}

function withPlayer(
  state: GameState,
  playerIndex: number,
  changes: {
    points?: number
    bonuses?: Partial<GameState['players'][number]['bonuses']>
    tokens?: Partial<GameState['players'][number]['tokens']>
    purchasedCards?: CardId[]
    nobles?: NobleId[]
  },
): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === playerIndex
        ? {
            ...player,
            points: changes.points ?? player.points,
            bonuses: { ...player.bonuses, ...changes.bonuses },
            tokens: { ...player.tokens, ...changes.tokens },
            purchasedCards: changes.purchasedCards ? [...changes.purchasedCards] : [...player.purchasedCards],
            nobles: changes.nobles ? [...changes.nobles] : [...player.nobles],
          }
        : player,
    ),
  }
}

function buyFor(playerId: PlayerId, cardId: CardId): Action {
  return { type: 'buy-card', playerId, cardId, source: 'market' }
}

function buy(cardId: CardId): Action {
  return buyFor('human', cardId)
}

function expectRuleError<T>(result: RuleResult<T>, code: string): void {
  expect(result).toEqual({
    ok: false,
    error: { code, message: expect.any(String) },
  })
}

test('eligibility uses permanent bonuses and ignores temporary tokens', () => {
  const state = {
    ...createInitialGame(123),
    availableNobles: ['noble-002'],
  }
  const withTokens = withPlayer(state, 0, {
    tokens: { fire: 3, water: 3, grass: 3 },
  })

  expect(getEligibleNobles(withTokens, 'human')).toEqual([])

  const withBonuses = withPlayer(withTokens, 0, {
    bonuses: { fire: 3, water: 3, grass: 3 },
  })

  expect(getEligibleNobles(withBonuses, 'human')).toEqual(['noble-002'])
})

test('automatically claims the only eligible noble after a purchase', () => {
  const state = withPlayer(
    withMarket(
      {
        ...createInitialGame(123),
        availableNobles: ['noble-002'],
      },
      1,
      [BULBASAUR],
    ),
    0,
    { bonuses: { fire: 3, water: 3, grass: 3 } },
  )
  const original = structuredClone(state)

  const result = applyAction(state, buy(BULBASAUR))

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(state).toEqual(original)
  expect(result.value.players[0].nobles).toEqual(['noble-002'])
  expect(result.value.players[0].points).toBe(3)
  expect(result.value.availableNobles).toEqual([])
  expect(result.value.pendingNobleIds).toEqual([])
  expect(result.value.pendingNoblePlayerId).toBeNull()
  expect(result.value.currentPlayerIndex).toBe(1)
  expect(result.value.eventLog.map((event) => event.type)).toEqual(['buy-card', 'claim-noble'])
})

test('pauses after a purchase when multiple nobles are eligible', () => {
  const state = withPlayer(
    withMarket(
      {
        ...createInitialGame(123),
        availableNobles: ['noble-001', 'noble-002'],
      },
      1,
      [BULBASAUR],
    ),
    0,
    {
      bonuses: { fire: 3, water: 3, grass: 3, electric: 3, psychic: 3 },
    },
  )

  const result = applyAction(state, buy(BULBASAUR))

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.value.pendingNobleIds).toEqual(['noble-001', 'noble-002'])
  expect(result.value.pendingNoblePlayerId).toBe('human')
  expect(result.value.currentPlayerIndex).toBe(0)
  expect(result.value.availableNobles).toEqual(['noble-001', 'noble-002'])
})

test('automatically resolves multiple nobles for an AI using requirement priority and seeded ties', () => {
  const state = withPlayer(
    withMarket(
      {
        ...createInitialGame(123),
        currentPlayerIndex: 2,
        randomSeed: 123,
        availableNobles: ['noble-001', 'noble-002', 'noble-004'],
      },
      1,
      [EEVEE],
    ),
    2,
    {
      points: 14,
      bonuses: { fire: 4, water: 3, grass: 4, electric: 3, psychic: 3 },
    },
  )
  const random = nextRandom(state.randomSeed)
  const expectedNoble = ['noble-001', 'noble-002'][Math.floor(random.value * 2)]

  const result = applyAction(state, buyFor('ai-2', EEVEE))

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.value.players[2].nobles).toEqual([expectedNoble])
  expect(result.value.players[2].points).toBe(18)
  expect(result.value.availableNobles).toEqual(
    ['noble-001', 'noble-002', 'noble-004'].filter((nobleId) => nobleId !== expectedNoble),
  )
  expect(result.value.pendingNobleIds).toEqual([])
  expect(result.value.pendingNoblePlayerId).toBeNull()
  expect(result.value.currentPlayerIndex).toBe(3)
  expect(result.value.phase).toBe('final-round')
  expect(result.value.finalRoundStartIndex).toBe(2)
  expect(result.value.randomSeed).toBe(random.seed)
  expect(result.value.eventLog.map((event) => event.type)).toEqual(['buy-card', 'claim-noble'])
})

test('finishes an AI-triggered final round when the turn returns to index two', () => {
  let state = withPlayer(
    withMarket(
      {
        ...createInitialGame(123),
        currentPlayerIndex: 2,
        randomSeed: 123,
        availableNobles: ['noble-001', 'noble-002', 'noble-004'],
      },
      1,
      [EEVEE],
    ),
    2,
    {
      points: 14,
      bonuses: { fire: 4, water: 3, grass: 4, electric: 3, psychic: 3 },
    },
  )
  const purchaseResult = applyAction(state, buyFor('ai-2', EEVEE))
  expect(purchaseResult.ok).toBe(true)
  if (!purchaseResult.ok) return
  state = purchaseResult.value

  const actions: Action[] = [
    { type: 'take-three-different', playerId: 'ai-3', colors: ['fire', 'water', 'grass'] },
    { type: 'take-three-different', playerId: 'human', colors: ['fire', 'water', 'electric'] },
    { type: 'take-three-different', playerId: 'ai-1', colors: ['grass', 'electric', 'psychic'] },
  ]

  for (const action of actions) {
    const result = applyAction(state, action)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    state = result.value
  }

  expect(state.currentPlayerIndex).toBe(2)
  expect(state.phase).toBe('finished')
  expect(state.finalRoundStartIndex).toBe(2)
  expect(state.eventLog).toHaveLength(5)
})

test('claims exactly one pending noble, clears the choice, and advances once', () => {
  const purchaseState = withPlayer(
    withMarket(
      {
        ...createInitialGame(123),
        availableNobles: ['noble-001', 'noble-002'],
      },
      1,
      [BULBASAUR],
    ),
    0,
    {
      bonuses: { fire: 3, water: 3, grass: 3, electric: 3, psychic: 3 },
    },
  )
  const purchaseResult = applyAction(purchaseState, buy(BULBASAUR))
  expect(purchaseResult.ok).toBe(true)
  if (!purchaseResult.ok) return

  const pendingState = purchaseResult.value
  const original = structuredClone(pendingState)
  const result = claimNoble(pendingState, 'human', 'noble-002')

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(pendingState).toEqual(original)
  expect(result.value.players[0].nobles).toEqual(['noble-002'])
  expect(result.value.players[0].points).toBe(3)
  expect(result.value.availableNobles).toEqual(['noble-001'])
  expect(result.value.pendingNobleIds).toEqual([])
  expect(result.value.pendingNoblePlayerId).toBeNull()
  expect(result.value.currentPlayerIndex).toBe(1)
  expect(result.value.eventLog.at(-1)).toEqual({
    type: 'claim-noble',
    playerId: 'human',
    message: expect.any(String),
  })
  expect(result.value.players[0].nobles).toHaveLength(1)

  expectRuleError(claimNoble(pendingState, 'ai-1', 'noble-001'), 'NO_PENDING_NOBLE')
  expectRuleError(claimNoble(pendingState, 'human', 'noble-003'), 'NOBLE_NOT_AVAILABLE')
  expect(pendingState).toEqual(original)
})

test('rejects claiming a noble from a finished game', () => {
  const state = withPlayer(
    {
      ...createInitialGame(123),
      phase: 'finished',
      availableNobles: ['noble-002'],
      pendingNobleIds: ['noble-002'],
      pendingNoblePlayerId: 'human',
    },
    0,
    { bonuses: { fire: 3, water: 3, grass: 3 } },
  )

  expectRuleError(claimNoble(state, 'human', 'noble-002'), 'GAME_FINISHED')
})

test('rejects claiming a noble when the pending player is not current', () => {
  const state = withPlayer(
    {
      ...createInitialGame(123),
      currentPlayerIndex: 1,
      availableNobles: ['noble-002'],
      pendingNobleIds: ['noble-002'],
      pendingNoblePlayerId: 'human',
    },
    0,
    { bonuses: { fire: 3, water: 3, grass: 3 } },
  )

  expectRuleError(claimNoble(state, 'human', 'noble-002'), 'NOT_CURRENT_PLAYER')
})

test('rejects claiming a noble that is no longer eligible from permanent bonuses', () => {
  const state: GameState = {
    ...createInitialGame(123),
    availableNobles: ['noble-002'],
    pendingNobleIds: ['noble-002'],
    pendingNoblePlayerId: 'human',
  }

  expectRuleError(claimNoble(state, 'human', 'noble-002'), 'NOBLE_NOT_ELIGIBLE')
})

test('rejects normal actions while a noble choice is pending', () => {
  const state: GameState = {
    ...createInitialGame(123),
    pendingNobleIds: ['noble-001'],
    pendingNoblePlayerId: 'human',
  }
  const action: Action = { type: 'take-two-same', playerId: 'human', color: 'fire' }

  expectRuleError(validateAction(state, action), 'PENDING_NOBLE')
  expect(getLegalActions(state, 'human')).toEqual([])
})

test('a purchase reaching fifteen points starts the final round without finishing', () => {
  const state = withPlayer(
    withMarket(
      {
        ...createInitialGame(123),
        availableNobles: [],
      },
      1,
      [EEVEE],
    ),
    0,
    { points: 14, tokens: { grass: 4 } },
  )
  const original = structuredClone(state)

  const result = applyAction(state, buy(EEVEE))

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(state).toEqual(original)
  expect(result.value.players[0].points).toBe(15)
  expect(result.value.phase).toBe('final-round')
  expect(result.value.finalRoundStartIndex).toBe(0)
  expect(result.value.currentPlayerIndex).toBe(1)
  expect(result.value.winnerIds).toEqual([])
})

test('lets remaining players act once and finishes when the turn returns to the trigger index', () => {
  let state: GameState = {
    ...createInitialGame(123),
    phase: 'final-round',
    finalRoundStartIndex: 0,
    currentPlayerIndex: 1,
  }
  const actions: Action[] = [
    { type: 'take-three-different', playerId: 'ai-1', colors: ['fire', 'water', 'grass'] },
    { type: 'take-three-different', playerId: 'ai-2', colors: ['fire', 'water', 'electric'] },
    { type: 'take-three-different', playerId: 'ai-3', colors: ['grass', 'electric', 'psychic'] },
  ]

  expect(checkGameEnd(state).phase).toBe('final-round')
  for (const action of actions) {
    const result = applyAction(state, action)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    state = result.value
  }

  expect(state.eventLog).toHaveLength(3)
  expect(state.currentPlayerIndex).toBe(0)
  expect(state.phase).toBe('finished')
  expect(checkGameEnd(state).phase).toBe('finished')
})

test('does not finish while the triggering player still has a pending noble choice', () => {
  const state: GameState = {
    ...createInitialGame(123),
    phase: 'final-round',
    finalRoundStartIndex: 0,
    currentPlayerIndex: 0,
    pendingNobleIds: ['noble-001', 'noble-002'],
    pendingNoblePlayerId: 'human',
  }

  expect(checkGameEnd(state).phase).toBe('final-round')
})

test('reaching fifteen through a noble starts the final round', () => {
  const state: GameState = {
    ...withPlayer(createInitialGame(123), 0, { points: 12, bonuses: { fire: 3, water: 3, grass: 3 } }),
    availableNobles: ['noble-002'],
    pendingNobleIds: ['noble-002'],
    pendingNoblePlayerId: 'human',
  }

  const result = claimNoble(state, 'human', 'noble-002')

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.value.players[0].points).toBe(15)
  expect(result.value.phase).toBe('final-round')
  expect(result.value.finalRoundStartIndex).toBe(0)
  expect(result.value.currentPlayerIndex).toBe(1)
})

test('combines card points with noble points when starting the final round', () => {
  const state = withPlayer(
    withMarket(
      {
        ...createInitialGame(123),
        availableNobles: ['noble-002'],
      },
      1,
      [EEVEE],
    ),
    0,
    {
      points: 11,
      bonuses: { fire: 3, water: 3, grass: 3 },
      tokens: { grass: 4 },
    },
  )

  const result = applyAction(state, buy(EEVEE))

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.value.players[0].points).toBe(15)
  expect(result.value.players[0].nobles).toEqual(['noble-002'])
  expect(result.value.phase).toBe('final-round')
  expect(result.value.finalRoundStartIndex).toBe(0)
})

test('ranks by points, then fewer purchased development cards, and preserves exact ties', () => {
  let state = withPlayer(
    createInitialGame(123),
    0,
    { points: 15, purchasedCards: ['a', 'b'] },
  )
  state = withPlayer(state, 1, { points: 15, purchasedCards: ['c', 'd', 'e'] })
  state = withPlayer(state, 2, { points: 15, purchasedCards: ['f', 'g'] })
  state = withPlayer(state, 3, { points: 14, purchasedCards: [] })
  state = {
    ...state,
    phase: 'final-round',
    finalRoundStartIndex: 0,
    currentPlayerIndex: 0,
  }

  expect(checkGameEnd(state)).toEqual({
    phase: 'finished',
    winnerIds: ['human', 'ai-2'],
    finalRoundStartIndex: 0,
  })
})

test('finished games reject further actions', () => {
  const action: Action = { type: 'take-two-same', playerId: 'human', color: 'fire' }

  expectRuleError(validateAction({ ...createInitialGame(123), phase: 'finished' }, action), 'GAME_FINISHED')
  expectRuleError(
    applyAction({ ...createInitialGame(123), phase: 'finished' }, action),
    'GAME_FINISHED',
  )
})

test('failed noble transitions do not mutate the input or nested data', () => {
  const state: GameState = {
    ...createInitialGame(123),
    availableNobles: ['noble-001'],
    pendingNobleIds: ['noble-001'],
    pendingNoblePlayerId: 'human',
  }
  const original = structuredClone(state)

  expectRuleError(claimNoble(state, 'human', 'noble-002'), 'NOBLE_NOT_AVAILABLE')
  expectRuleError(claimNoble(state, 'ai-1', 'noble-001'), 'NO_PENDING_NOBLE')
  expect(state).toEqual(original)
  expect(state.availableNobles).toEqual(original.availableNobles)
  expect(state.pendingNobleIds).toEqual(original.pendingNobleIds)
  expect(state.players[0].nobles).toEqual(original.players[0].nobles)
})
