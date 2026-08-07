import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import * as ai from '../ai/chooseAction'
import type { Action, GameState } from '../domain/model'
import { nextRandom } from '../domain/random'
import { createInitialGame } from '../domain/setup'
import { useGameSession } from './useGameSession'

const humanTokenAction: Action = {
  type: 'take-three-different',
  playerId: 'human',
  colors: ['fire', 'water', 'grass'],
}

function createPendingHumanState(): GameState {
  const state = structuredClone(createInitialGame(123))

  state.players[0] = {
    ...state.players[0],
    bonuses: {
      fire: 4,
      water: 4,
      grass: 4,
      electric: 4,
      psychic: 4,
    },
  }
  state.pendingNobleIds = state.availableNobles.slice(0, 2)
  state.pendingNoblePlayerId = 'human'

  return state
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

test('initializes from a fixed seed and exposes pending noble ids', () => {
  const seed = 918273
  const expected = createInitialGame(seed)
  const { result, unmount } = renderHook(() => useGameSession(seed))

  expect(result.current.state).toEqual(expected)
  expect(result.current.pendingNobleIds).toBe(result.current.state.pendingNobleIds)
  expect(result.current.pendingNobleIds).toEqual([])

  unmount()
})

test('selecting a card changes only selected-card state', () => {
  const { result, unmount } = renderHook(() => useGameSession(123))
  const stateBefore = result.current.state
  const cardId = stateBefore.market[1][0]

  act(() => {
    result.current.selectCard(cardId)
  })

  expect(result.current.state).toBe(stateBefore)
  expect(result.current.selectedCardId).toBe(cardId)

  unmount()
})

test('applies a legal human action and advances to the first ai player', () => {
  const { result, unmount } = renderHook(() => useGameSession(123))

  act(() => {
    result.current.dispatch(humanTokenAction)
  })

  expect(result.current.state.players[0].tokens).toMatchObject({ fire: 1, water: 1, grass: 1 })
  expect(result.current.state.currentPlayerIndex).toBe(1)
  expect(result.current.lastError).toBeNull()

  unmount()
})

test('preserves state and event-log identity when an action is illegal', () => {
  const { result, unmount } = renderHook(() => useGameSession(123))
  const stateBefore = result.current.state
  const eventLogBefore = stateBefore.eventLog
  const illegalAction: Action = {
    type: 'take-three-different',
    playerId: 'human',
    colors: ['fire', 'fire', 'water'],
  }

  act(() => {
    result.current.dispatch(illegalAction)
  })

  expect(result.current.state).toBe(stateBefore)
  expect(result.current.state.eventLog).toBe(eventLogBefore)
  expect(result.current.lastError).toEqual({
    code: 'DUPLICATE_COLORS',
    message: 'Three different colors are required.',
  })

  unmount()
})

test('preserves state and event-log identity when claiming a noble without a pending choice', () => {
  const { result, unmount } = renderHook(() => useGameSession(123))
  const stateBefore = result.current.state
  const eventLogBefore = stateBefore.eventLog

  act(() => {
    result.current.claimNoble('noble-001')
  })

  expect(result.current.state).toBe(stateBefore)
  expect(result.current.state.eventLog).toBe(eventLogBefore)
  expect(result.current.lastError).toEqual({
    code: 'NO_PENDING_NOBLE',
    message: 'This player has no pending noble choice.',
  })

  unmount()
})

test('clears the last error after a later legal human action succeeds', () => {
  const { result, unmount } = renderHook(() => useGameSession(123))
  const illegalAction: Action = {
    type: 'take-three-different',
    playerId: 'human',
    colors: ['fire', 'fire', 'water'],
  }

  act(() => {
    result.current.dispatch(illegalAction)
  })
  expect(result.current.lastError?.code).toBe('DUPLICATE_COLORS')

  act(() => {
    result.current.dispatch(humanTokenAction)
  })

  expect(result.current.state.players[0].tokens).toMatchObject({ fire: 1, water: 1, grass: 1 })
  expect(result.current.state.currentPlayerIndex).toBe(1)
  expect(result.current.lastError).toBeNull()

  unmount()
})

test('claims a pending human noble and advances exactly once', () => {
  const pendingState = createPendingHumanState()
  const { result, unmount } = renderHook(() => useGameSession(123, pendingState))
  const nobleId = pendingState.pendingNobleIds[0]

  expect(result.current.pendingNobleIds).toEqual(pendingState.pendingNobleIds)

  act(() => {
    result.current.claimNoble(nobleId)
  })

  expect(result.current.state.currentPlayerIndex).toBe(1)
  expect(result.current.state.players[0].nobles).toEqual([nobleId])
  expect(result.current.state.eventLog).toHaveLength(1)
  expect(result.current.pendingNobleIds).toEqual([])
  expect(result.current.lastError).toBeNull()

  unmount()
})

test('does not schedule an ai timer for a supplied finished state', () => {
  const finishedState = structuredClone(createInitialGame(123))
  finishedState.phase = 'finished'
  finishedState.currentPlayerIndex = 1
  finishedState.winnerIds = ['human']
  const { result, unmount } = renderHook(() => useGameSession(123, finishedState))

  expect(result.current.state).toBe(finishedState)
  expect(vi.getTimerCount()).toBe(0)

  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

test('does not schedule an ai timer for a supplied pending human noble choice', () => {
  const pendingState = createPendingHumanState()
  const { result, unmount } = renderHook(() => useGameSession(123, pendingState))

  expect(result.current.state).toBe(pendingState)
  expect(result.current.pendingNobleIds).toEqual(pendingState.pendingNobleIds)
  expect(vi.getTimerCount()).toBe(0)

  unmount()
  expect(vi.getTimerCount()).toBe(0)
})

test('runs one ai action per timer and progresses through the fixed turn order', () => {
  const chooseSpy = vi.spyOn(ai, 'chooseAiAction')
  const { result, unmount } = renderHook(() => useGameSession(123))

  act(() => {
    result.current.dispatch(humanTokenAction)
  })

  expect(chooseSpy).not.toHaveBeenCalled()
  expect(vi.getTimerCount()).toBe(1)

  act(() => {
    vi.advanceTimersByTime(399)
  })
  expect(chooseSpy).not.toHaveBeenCalled()
  expect(result.current.state.eventLog).toHaveLength(1)

  act(() => {
    vi.advanceTimersByTime(1)
  })
  expect(chooseSpy).toHaveBeenCalledTimes(1)
  expect(chooseSpy).toHaveBeenLastCalledWith(expect.any(Object), 'ai-1')
  expect(result.current.state.currentPlayerIndex).toBe(2)
  expect(result.current.state.eventLog).toHaveLength(2)
  expect(vi.getTimerCount()).toBe(1)

  act(() => {
    vi.advanceTimersByTime(400)
  })
  expect(chooseSpy).toHaveBeenCalledTimes(2)
  expect(result.current.state.currentPlayerIndex).toBe(3)

  act(() => {
    vi.advanceTimersByTime(400)
  })
  expect(chooseSpy).toHaveBeenCalledTimes(3)
  expect(result.current.state.currentPlayerIndex).toBe(0)
  expect(result.current.state.eventLog.map((event) => event.playerId)).toEqual([
    'human',
    'ai-1',
    'ai-2',
    'ai-3',
  ])
  expect(vi.getTimerCount()).toBe(0)

  unmount()
})

test('restart derives a new seed, clears ui errors, and cancels the old ai timer', () => {
  const { result, unmount } = renderHook(() => useGameSession(123))
  const initialState = result.current.state
  const cardId = initialState.market[1][0]

  act(() => {
    result.current.selectCard(cardId)
    result.current.dispatch(humanTokenAction)
  })
  expect(vi.getTimerCount()).toBe(1)

  act(() => {
    result.current.dispatch({
      type: 'take-three-different',
      playerId: 'human',
      colors: ['fire', 'water', 'grass'],
    })
  })
  expect(result.current.lastError?.code).toBe('NOT_CURRENT_PLAYER')

  const restartSeed = nextRandom(initialState.randomSeed).seed
  const expectedRestart = createInitialGame(restartSeed)
  act(() => {
    result.current.restart()
  })

  expect(result.current.state).not.toBe(initialState)
  expect(result.current.state).toEqual(expectedRestart)
  expect(result.current.state.randomSeed).not.toBe(initialState.randomSeed)
  expect(result.current.state.eventLog).toEqual([])
  expect(result.current.state.currentPlayerIndex).toBe(0)
  expect(result.current.selectedCardId).toBeNull()
  expect(result.current.lastError).toBeNull()
  expect(vi.getTimerCount()).toBe(0)

  act(() => {
    vi.advanceTimersByTime(1000)
  })
  expect(result.current.state).toEqual(expectedRestart)
  expect(result.current.state.eventLog).toEqual([])

  unmount()
})

test('cleans ai timers on unmount without state-update warnings', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const { result, unmount } = renderHook(() => useGameSession(123))

  act(() => {
    result.current.dispatch(humanTokenAction)
  })
  expect(vi.getTimerCount()).toBe(1)

  unmount()
  expect(vi.getTimerCount()).toBe(0)

  act(() => {
    vi.advanceTimersByTime(1000)
  })
  expect(errorSpy).not.toHaveBeenCalled()
})
