import { createInitialGame } from './setup'
import type { Action, GameState } from './model'
import { totalTokens, zeroTokenInventory } from './inventory'
import { getLegalActions, validateAction } from './action-legality'
import { applyAction } from './action-apply'

function withBank(state: GameState, changes: Partial<GameState['tokenBank']>): GameState {
  return {
    ...state,
    tokenBank: { ...state.tokenBank, ...changes },
  }
}

function withPlayerTokens(
  state: GameState,
  playerIndex: number,
  changes: Partial<GameState['players'][number]['tokens']>,
): GameState {
  return {
    ...state,
    players: state.players.map((player, index) =>
      index === playerIndex
        ? { ...player, tokens: { ...player.tokens, ...changes } }
        : player,
    ),
  }
}

test('enumerates every legal three-different combination in stable color order', () => {
  const actions = getLegalActions(createInitialGame(123), 'human')
  const differentActions = actions.filter(
    (action): action is Extract<Action, { type: 'take-three-different' }> =>
      action.type === 'take-three-different',
  )

  expect(differentActions).toEqual([
    { type: 'take-three-different', playerId: 'human', colors: ['fire', 'water', 'grass'] },
    { type: 'take-three-different', playerId: 'human', colors: ['fire', 'water', 'electric'] },
    { type: 'take-three-different', playerId: 'human', colors: ['fire', 'water', 'psychic'] },
    { type: 'take-three-different', playerId: 'human', colors: ['fire', 'grass', 'electric'] },
    { type: 'take-three-different', playerId: 'human', colors: ['fire', 'grass', 'psychic'] },
    { type: 'take-three-different', playerId: 'human', colors: ['fire', 'electric', 'psychic'] },
    { type: 'take-three-different', playerId: 'human', colors: ['water', 'grass', 'electric'] },
    { type: 'take-three-different', playerId: 'human', colors: ['water', 'grass', 'psychic'] },
    { type: 'take-three-different', playerId: 'human', colors: ['water', 'electric', 'psychic'] },
    { type: 'take-three-different', playerId: 'human', colors: ['grass', 'electric', 'psychic'] },
  ])
})

test('enumerates same-color actions only when the bank has four tokens', () => {
  const state = withBank(createInitialGame(123), { fire: 4, water: 3 })
  const actions = getLegalActions(state, 'human')

  expect(actions).toContainEqual({ type: 'take-two-same', playerId: 'human', color: 'fire' })
  expect(actions).not.toContainEqual({ type: 'take-two-same', playerId: 'human', color: 'water' })
})

test('rejects duplicate colors in a three-different action', () => {
  const action: Action = {
    type: 'take-three-different',
    playerId: 'human',
    colors: ['fire', 'fire', 'grass'],
  }

  const result = validateAction(createInitialGame(123), action)

  expect(result).toEqual({
    ok: false,
    error: {
      code: 'DUPLICATE_COLORS',
      message: expect.any(String),
    },
  })
})

test('rejects a token action when the bank cannot provide the requested tokens', () => {
  const state = withBank(createInitialGame(123), { fire: 0 })
  const action: Action = {
    type: 'take-three-different',
    playerId: 'human',
    colors: ['fire', 'water', 'grass'],
  }

  const result = validateAction(state, action)

  expect(result).toEqual({
    ok: false,
    error: {
      code: 'INSUFFICIENT_BANK',
      message: expect.any(String),
    },
  })
})

test('allows a token action beyond ten tokens and discards the overflow when applied', () => {
  const state = withPlayerTokens(createInitialGame(123), 0, { fire: 8 })
  const action: Action = {
    type: 'take-three-different',
    playerId: 'human',
    colors: ['fire', 'water', 'grass'],
  }

  expect(validateAction(state, action)).toEqual({
    ok: true,
    value: undefined,
  })

  const result = applyAction(state, action)
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(totalTokens(result.value.players[0].tokens)).toBe(10)
  }
})

test('requires four bank tokens for a same-color action', () => {
  const action: Action = { type: 'take-two-same', playerId: 'human', color: 'fire' }

  expect(validateAction(withBank(createInitialGame(123), { fire: 3 }), action)).toEqual({
    ok: false,
    error: {
      code: 'INSUFFICIENT_BANK',
      message: expect.any(String),
    },
  })
  expect(validateAction(withBank(createInitialGame(123), { fire: 4 }), action)).toEqual({
    ok: true,
    value: undefined,
  })
})

test('allows a same-color action on a two-token color when the bank has fewer than three colors', () => {
  const state = withBank(createInitialGame(123), {
    fire: 2,
    water: 2,
    grass: 0,
    electric: 0,
    psychic: 0,
  })
  const action: Action = { type: 'take-two-same', playerId: 'human', color: 'fire' }

  expect(validateAction(state, action)).toEqual({
    ok: true,
    value: undefined,
  })
  expect(getLegalActions(state, 'human')).toContainEqual(action)
  expect(getLegalActions(state, 'human')).toContainEqual({
    type: 'take-two-same',
    playerId: 'human',
    color: 'water',
  })
})

test('keeps a same-color action legal when only one two-token color remains in a low bank', () => {
  const state = withBank(createInitialGame(123), {
    fire: 2,
    grass: 1,
    water: 0,
    electric: 0,
    psychic: 0,
  })

  expect(validateAction(state, { type: 'take-two-same', playerId: 'human', color: 'fire' })).toEqual({
    ok: true,
    value: undefined,
  })
  expect(validateAction(state, { type: 'take-two-same', playerId: 'human', color: 'grass' })).toEqual({
    ok: false,
    error: {
      code: 'INSUFFICIENT_BANK',
      message: expect.any(String),
    },
  })
})

test('applies the four-token rule once the bank is no longer low', () => {
  const state = withBank(createInitialGame(123), {
    fire: 3,
    water: 1,
    grass: 1,
    electric: 0,
    psychic: 0,
  })
  const fireAction: Action = { type: 'take-two-same', playerId: 'human', color: 'fire' }
  const waterAction: Action = { type: 'take-two-same', playerId: 'human', color: 'water' }

  expect(validateAction(state, fireAction)).toEqual({
    ok: false,
    error: {
      code: 'INSUFFICIENT_BANK',
      message: expect.any(String),
    },
  })
  expect(validateAction(state, waterAction)).toEqual({
    ok: false,
    error: {
      code: 'INSUFFICIENT_BANK',
      message: expect.any(String),
    },
  })
  expect(
    validateAction({ ...state, tokenBank: { ...state.tokenBank, fire: 4 } }, fireAction),
  ).toEqual({
    ok: true,
    value: undefined,
  })
})

test('does not offer actions to a player who is not current', () => {
  const state = createInitialGame(123)

  expect(getLegalActions(state, 'ai-1')).toEqual([])
})

test('rejects a declared actor who is not the current player', () => {
  const action: Action = {
    type: 'take-two-same',
    playerId: 'ai-1',
    color: 'fire',
  }

  expect(validateAction(createInitialGame(123), action)).toEqual({
    ok: false,
    error: {
      code: 'NOT_CURRENT_PLAYER',
      message: expect.any(String),
    },
  })
})

test('includes the requested player in every generated token action', () => {
  expect(getLegalActions(createInitialGame(123), 'human')).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ playerId: 'human' }),
    ]),
  )
})

test('rejects finished games but validates actions in the final round', () => {
  const action: Action = { type: 'take-two-same', playerId: 'human', color: 'fire' }

  expect(validateAction({ ...createInitialGame(123), phase: 'finished' }, action)).toEqual({
    ok: false,
    error: {
      code: 'GAME_FINISHED',
      message: expect.any(String),
    },
  })
  expect(validateAction({ ...createInitialGame(123), phase: 'final-round' }, action)).toEqual({
    ok: true,
    value: undefined,
  })
})

test('still offers token actions at the limit because overflow is discarded', () => {
  const state = withPlayerTokens(createInitialGame(123), 0, {
    ...zeroTokenInventory(),
    fire: 9,
  })

  const actions = getLegalActions(state, 'human')

  expect(actions.some((action) => action.type === 'take-three-different')).toBe(true)
  expect(actions.some((action) => action.type === 'take-two-same')).toBe(true)
  expect(actions.some((action) => action.type === 'reserve-card')).toBe(true)
})
