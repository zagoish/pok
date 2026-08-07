import { chooseAiAction } from '../ai/chooseAction'
import { applyAction } from '../domain/action-apply'
import { getLegalActions } from '../domain/action-legality'
import { totalTokens } from '../domain/inventory'
import { claimNoble } from '../domain/nobles'
import { createInitialGame } from '../domain/setup'
import type { Action, GameState, PlayerId } from '../domain/model'

const MAX_STEPS = 2000
const HUMAN_ID: PlayerId = 'human'
const PLAYER_IDS = new Set<PlayerId>(['human', 'ai-1', 'ai-2', 'ai-3'])
const FINAL_EVENT_TYPES = new Set([
  'take-three-different',
  'take-two-same',
  'buy-card',
  'reserve-card',
  'claim-noble',
  'skip',
])

interface Outcome {
  steps: number
  round: number
  winnerIds: PlayerId[]
  finalEventType: string | null
  finalEventPlayerId: PlayerId | null
  humanNobleChoices: number
}

function chooseHumanAction(state: GameState): Action {
  const legalActions = getLegalActions(state, HUMAN_ID)

  if (legalActions.length === 0) {
    throw new Error(`NO_LEGAL_ACTIONS: human stalled at round ${state.round}`)
  }

  const purchase = legalActions.find((action) => action.type === 'buy-card')
  if (purchase) return purchase

  const reservation = legalActions.find((action) => action.type === 'reserve-card')
  if (reservation) return reservation

  return legalActions[0]
}

function assertStepConsistency(before: GameState, after: GameState): void {
  expect(
    after.currentPlayerIndex !== before.currentPlayerIndex || after.round === before.round + 1,
  ).toBe(true)
  expect(after.round).toBe(
    before.round + (after.currentPlayerIndex <= before.currentPlayerIndex ? 1 : 0),
  )
}

function assertTokenLimit(state: GameState): void {
  for (const player of state.players) {
    expect(totalTokens(player.tokens)).toBeLessThanOrEqual(10)
  }
}

function playFullGame(seed: number): Outcome {
  let state = createInitialGame(seed)
  let steps = 0
  let humanNobleChoices = 0

  while (state.phase !== 'finished') {
    if (steps >= MAX_STEPS) {
      throw new Error(
        `GAME_DID_NOT_FINISH: still ${state.phase} after ${MAX_STEPS} steps (seed ${seed})`,
      )
    }

    const before = state
    const currentPlayer = state.players[state.currentPlayerIndex]

    if (state.pendingNobleIds.length > 0) {
      humanNobleChoices += 1
      const result = claimNoble(state, state.pendingNoblePlayerId ?? HUMAN_ID, state.pendingNobleIds[0])
      expect(result.ok).toBe(true)
      if (!result.ok) break
      state = result.value
    } else if (currentPlayer.isHuman) {
      const result = applyAction(state, chooseHumanAction(state))
      expect(result.ok).toBe(true)
      if (!result.ok) break
      state = result.value
    } else {
      const result = applyAction(state, chooseAiAction(state, currentPlayer.id))
      expect(result.ok).toBe(true)
      if (!result.ok) break
      state = result.value
    }

    steps += 1

    if (state.pendingNobleIds.length === 0) {
      assertStepConsistency(before, state)
    }
    assertTokenLimit(state)
  }

  expect(state.phase).toBe('finished')
  expect(state.eventLog.length).toBeGreaterThan(0)

  const lastEvent = state.eventLog[state.eventLog.length - 1]
  expect(FINAL_EVENT_TYPES.has(lastEvent.type)).toBe(true)
  expect(PLAYER_IDS.has(lastEvent.playerId)).toBe(true)

  expect(state.winnerIds.length).toBeGreaterThan(0)
  for (const winnerId of state.winnerIds) {
    expect(PLAYER_IDS.has(winnerId)).toBe(true)
  }

  expect(state.finalRoundStartIndex).not.toBeNull()
  expect(state.round).toBe(1 + Math.floor(steps / state.players.length))

  return {
    steps,
    round: state.round,
    winnerIds: [...state.winnerIds],
    finalEventType: lastEvent.type,
    finalEventPlayerId: lastEvent.playerId,
    humanNobleChoices,
  }
}

const SEEDS = [1, 42, 123, 2026]

for (const seed of SEEDS) {
  test(`plays a complete four-player game to completion with seed ${seed}`, () => {
    const outcome = playFullGame(seed)

    expect(outcome.steps).toBeGreaterThan(0)
    expect(outcome.steps).toBeLessThan(MAX_STEPS)
  })
}

test('different seeds produce different outcomes at least once', () => {
  const outcomes = SEEDS.map((seed) => playFullGame(seed))
  const signatures = new Set(
    outcomes.map((outcome) => `${outcome.winnerIds.join(',')}|${outcome.steps}|${outcome.round}`),
  )
  expect(signatures.size).toBeGreaterThan(1)
})
