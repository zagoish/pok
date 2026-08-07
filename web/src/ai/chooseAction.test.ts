import { applyAction } from '../domain/action-apply'
import { getLegalActions } from '../domain/action-legality'
import { claimNoble } from '../domain/nobles'
import { createInitialGame } from '../domain/setup'
import type { Action, CardId, GameState, Tier } from '../domain/model'
import { chooseAiAction } from './chooseAction'

function baseState(seed = 123): GameState {
  const state = createInitialGame(seed)

  return {
    ...state,
    market: { 1: [], 2: [], 3: [] },
    decks: { 1: [], 2: [], 3: [] },
    availableNobles: [],
  }
}

function withMarket(state: GameState, tier: Tier, cardIds: CardId[]): GameState {
  return {
    ...state,
    market: { ...state.market, [tier]: [...cardIds] },
  }
}

function withPlayer(
  state: GameState,
  playerIndex: number,
  changes: {
    tokens?: Partial<GameState['players'][number]['tokens']>
    bonuses?: Partial<GameState['players'][number]['bonuses']>
    points?: number
    reservedCards?: CardId[]
    nobles?: string[]
  },
): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === playerIndex
        ? {
            ...player,
            tokens: { ...player.tokens, ...changes.tokens },
            bonuses: { ...player.bonuses, ...changes.bonuses },
            points: changes.points ?? player.points,
            reservedCards: changes.reservedCards
              ? [...changes.reservedCards]
              : [...player.reservedCards],
            nobles: changes.nobles ? [...changes.nobles] : [...player.nobles],
          }
        : player,
    ),
  }
}

function expectSuccessfulAction(state: GameState, action: Action): GameState {
  const result = applyAction(state, action)
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error(result.error.code)
  return result.value
}

test('returns a legal action for every AI player in the initial position', () => {
  for (const [playerIndex, playerId] of [
    [1, 'ai-1'],
    [2, 'ai-2'],
    [3, 'ai-3'],
  ] as const) {
    const state = { ...createInitialGame(123), currentPlayerIndex: playerIndex }
    const action = chooseAiAction(state, playerId)

    expect(getLegalActions(state, playerId)).toContainEqual(action)
  }
})

test('ranks noble-triggering purchases before seeded tie-breaking', () => {
  let state = baseState()
  state = withMarket(state, 1, ['tier-1-025', 'tier-1-029'])
  state = {
    ...state,
    currentPlayerIndex: 1,
    availableNobles: ['noble-002'],
    randomSeed: 0,
  }
  state = withPlayer(state, 1, {
    bonuses: { fire: 2, water: 3, grass: 3 },
    tokens: { electric: 4 },
  })

  const legalActions = getLegalActions(state, 'ai-1')
  expect(legalActions).toContainEqual({
    type: 'buy-card',
    playerId: 'ai-1',
    cardId: 'tier-1-025',
    source: 'market',
  })
  expect(legalActions).toContainEqual({
    type: 'buy-card',
    playerId: 'ai-1',
    cardId: 'tier-1-029',
    source: 'market',
  })

  const noblePurchaseActions: Action[] = [
    { type: 'buy-card', playerId: 'ai-1', cardId: 'tier-1-025', source: 'market' },
    { type: 'buy-card', playerId: 'ai-1', cardId: 'tier-1-029', source: 'market' },
  ]
  for (const purchaseAction of noblePurchaseActions) {
    const nextState = expectSuccessfulAction(state, purchaseAction)
    expect(nextState.players[1].nobles).toEqual(['noble-002'])
  }

  const action = chooseAiAction(state, 'ai-1')

  expect(action).toEqual({
    type: 'buy-card',
    playerId: 'ai-1',
    cardId: 'tier-1-029',
    source: 'market',
  })
})

test('chooses an immediate noble purchase over a more valuable ordinary purchase', () => {
  let state = baseState()
  state = withMarket(state, 1, ['tier-1-025', 'tier-1-005'])
  state = {
    ...state,
    currentPlayerIndex: 1,
    availableNobles: ['noble-002'],
  }
  state = withPlayer(state, 1, {
    bonuses: { fire: 2, water: 3, grass: 3 },
    tokens: { water: 2, grass: 1 },
  })

  const action = chooseAiAction(state, 'ai-1')

  expect(action).toEqual({
    type: 'buy-card',
    playerId: 'ai-1',
    cardId: 'tier-1-025',
    source: 'market',
  })

  const nextState = expectSuccessfulAction(state, action)
  expect(nextState.players[1].nobles).toHaveLength(1)
  expect(nextState.players[1].nobles).toEqual(['noble-002'])
})

test('chooses a high-point purchasable card before taking tokens', () => {
  let state = baseState()
  state = withMarket(state, 2, ['tier-2-002'])
  state = { ...state, currentPlayerIndex: 1 }
  state = withPlayer(state, 1, { tokens: { electric: 6 } })

  expect(chooseAiAction(state, 'ai-1')).toEqual({
    type: 'buy-card',
    playerId: 'ai-1',
    cardId: 'tier-2-002',
    source: 'market',
  })
})

test('purchases a reserved card when it is the best legal purchase', () => {
  let state = baseState()
  state = withMarket(state, 1, ['tier-1-005'])
  state = { ...state, currentPlayerIndex: 1 }
  state = withPlayer(state, 1, {
    tokens: { grass: 4, electric: 6 },
    reservedCards: ['tier-2-002'],
  })

  expect(chooseAiAction(state, 'ai-1')).toEqual({
    type: 'buy-card',
    playerId: 'ai-1',
    cardId: 'tier-2-002',
    source: 'reserved',
  })
})

test('reserves the most affordable visible card when no purchase is possible', () => {
  let state = baseState()
  state = withMarket(state, 1, ['tier-1-001'])
  state = withMarket(state, 3, ['tier-3-002'])
  state = { ...state, currentPlayerIndex: 1 }

  expect(chooseAiAction(state, 'ai-1')).toEqual({
    type: 'reserve-card',
    playerId: 'ai-1',
    cardId: 'tier-1-001',
    tier: 1,
  })
})

test('takes tokens toward the best target and falls back to the first legal action without targets', () => {
  let targetState = baseState()
  targetState = withMarket(targetState, 1, ['tier-1-005'])
  targetState = { ...targetState, currentPlayerIndex: 1 }
  targetState = withPlayer(targetState, 1, {
    reservedCards: ['tier-1-001', 'tier-1-002', 'tier-1-003'],
  })

  expect(chooseAiAction(targetState, 'ai-1')).toEqual({
    type: 'take-two-same',
    playerId: 'ai-1',
    color: 'grass',
  })

  const emptyState = { ...baseState(), currentPlayerIndex: 1 }
  const firstLegalAction = getLegalActions(emptyState, 'ai-1')[0]
  expect(chooseAiAction(emptyState, 'ai-1')).toEqual(firstLegalAction)
})

test('uses the seed to make reproducible tie choices without mutating it', () => {
  let state = baseState(123)
  state = withMarket(state, 1, ['tier-1-001'])
  state = {
    ...state,
    currentPlayerIndex: 1,
    tokenBank: {
      fire: 3,
      water: 3,
      grass: 3,
      electric: 3,
      psychic: 3,
      rainbow: 0,
    },
  }
  state = withPlayer(state, 1, {
    reservedCards: ['tier-1-002', 'tier-1-003', 'tier-1-006'],
  })
  const originalSeed = state.randomSeed

  const sameSeedAction = chooseAiAction(state, 'ai-1')
  const repeatedAction = chooseAiAction(state, 'ai-1')
  const differentSeedAction = chooseAiAction({ ...state, randomSeed: 987654321 }, 'ai-1')

  expect(sameSeedAction).toEqual(repeatedAction)
  expect(differentSeedAction).not.toEqual(sameSeedAction)
  expect(state.randomSeed).toBe(originalSeed)
  expect(getLegalActions(state, 'ai-1')).toContainEqual(sameSeedAction)
  expect(getLegalActions(state, 'ai-1')).toContainEqual(differentSeedAction)
})

test('three AI players and deterministic human actions finish a fixed-seed game legally', () => {
  let state = createInitialGame(8)
  let turns = 0

  while (state.phase !== 'finished' && turns < 2000) {
    if (state.pendingNobleIds.length > 0) {
      expect(state.pendingNoblePlayerId).toBe('human')
      const nobleResult = claimNoble(state, 'human', state.pendingNobleIds[0])
      expect(nobleResult.ok).toBe(true)
      if (!nobleResult.ok) throw new Error(nobleResult.error.code)
      state = nobleResult.value
      turns += 1
      continue
    }

    const currentPlayer = state.players[state.currentPlayerIndex]
    const action: Action = currentPlayer.isHuman
      ? getLegalActions(state, currentPlayer.id)[0]
      : chooseAiAction(state, currentPlayer.id)
    const legalActions = getLegalActions(state, currentPlayer.id)

    expect(action).toBeDefined()
    expect(legalActions).toContainEqual(action)

    const nextState = expectSuccessfulAction(state, action)
    for (const player of nextState.players) {
      const tokenCount = Object.values(player.tokens).reduce((total, count) => total + count, 0)
      expect(tokenCount).toBeLessThanOrEqual(10)
    }
    state = nextState
    turns += 1
  }

  expect(state.phase).toBe('finished')
  expect(turns).toBeLessThan(2000)
})

test('throws NO_LEGAL_ACTIONS when no action is available', () => {
  const state = { ...baseState(), phase: 'finished' as const, currentPlayerIndex: 1 }

  expect(() => chooseAiAction(state, 'ai-1')).toThrow('NO_LEGAL_ACTIONS')
})
