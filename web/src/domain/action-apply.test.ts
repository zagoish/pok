import { applyAction } from './action-apply'
import { createInitialGame } from './setup'
import type { Action, GameState } from './model'
import { zeroTokenInventory } from './inventory'

function withBank(state: GameState, changes: Partial<GameState['tokenBank']>): GameState {
  return {
    ...state,
    tokenBank: { ...state.tokenBank, ...changes },
  }
}

test('updates inventory, bank, event log, and turn without mutating the input state', () => {
  const existingEvent = { type: 'setup', playerId: 'human' as const, message: 'setup' }
  const state = {
    ...createInitialGame(123),
    eventLog: [existingEvent],
  }
  const original = structuredClone(state)
  const action: Action = {
    type: 'take-three-different',
    playerId: 'human',
    colors: ['fire', 'water', 'grass'],
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
  expect(next.tokenBank).not.toBe(state.tokenBank)
  expect(next.eventLog).not.toBe(state.eventLog)
  expect(next.decks).not.toBe(state.decks)
  expect(next.decks[1]).not.toBe(state.decks[1])
  expect(next.market).not.toBe(state.market)
  expect(next.market[1]).not.toBe(state.market[1])
  expect(next.availableNobles).not.toBe(state.availableNobles)
  expect(next.winnerIds).not.toBe(state.winnerIds)

  expect(next.players[0].tokens).toEqual({
    fire: 1,
    water: 1,
    grass: 1,
    electric: 0,
    psychic: 0,
    rainbow: 0,
  })
  expect(next.tokenBank).toMatchObject({ fire: 6, water: 6, grass: 6 })
  expect(next.eventLog).toHaveLength(2)
  expect(next.eventLog[0]).toEqual(existingEvent)
  expect(next.eventLog[0]).not.toBe(existingEvent)
  expect(next.eventLog[1]).toEqual({
    type: 'take-three-different',
    playerId: 'human',
    message: expect.stringContaining('fire'),
  })
  expect(next.currentPlayerIndex).toBe(1)
  expect(next.round).toBe(1)
})

test('applies a same-color action by taking exactly two tokens', () => {
  const state = createInitialGame(123)
  const action: Action = { type: 'take-two-same', playerId: 'human', color: 'psychic' }

  const result = applyAction(state, action)

  expect(result.ok).toBe(true)
  if (!result.ok) return

  expect(result.value.players[0].tokens.psychic).toBe(2)
  expect(result.value.tokenBank.psychic).toBe(5)
})

test('increments the round after all four players have taken a turn', () => {
  let state = createInitialGame(123)
  const actions: Action[] = [
    { type: 'take-three-different', playerId: 'human', colors: ['fire', 'water', 'grass'] },
    { type: 'take-three-different', playerId: 'ai-1', colors: ['fire', 'water', 'electric'] },
    { type: 'take-three-different', playerId: 'ai-2', colors: ['fire', 'grass', 'psychic'] },
    { type: 'take-three-different', playerId: 'ai-3', colors: ['water', 'electric', 'psychic'] },
  ]

  for (const action of actions) {
    const result = applyAction(state, action)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    state = result.value
  }

  expect(state.currentPlayerIndex).toBe(0)
  expect(state.round).toBe(2)
  expect(state.eventLog).toHaveLength(4)
})

test('returns a validation error and leaves nested input state unchanged on failure', () => {
  const state = withBank(createInitialGame(123), { fire: 0 })
  const original = structuredClone(state)
  const action: Action = {
    type: 'take-three-different',
    playerId: 'human',
    colors: ['fire', 'water', 'grass'],
  }

  const result = applyAction(state, action)

  expect(result).toEqual({
    ok: false,
    error: {
      code: 'INSUFFICIENT_BANK',
      message: expect.any(String),
    },
  })
  expect(state).toEqual(original)
  expect(state.players[0].tokens).toEqual(zeroTokenInventory())
})
