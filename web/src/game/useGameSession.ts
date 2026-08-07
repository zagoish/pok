import { useEffect, useReducer, useRef } from 'react'
import { chooseAiAction } from '../ai/chooseAction'
import { applyAction } from '../domain/action-apply'
import { claimNoble as claimNobleAction } from '../domain/nobles'
import { nextRandom } from '../domain/random'
import { createInitialGame } from '../domain/setup'
import type { Action, CardId, GameState, NobleId, RuleError } from '../domain/model'

const DEFAULT_SEED = 123
const AI_TURN_DELAY_MS = 400

interface SessionState {
  state: GameState
  selectedCardId: CardId | null
  lastError: RuleError | null
}

type SessionAction =
  | { type: 'select-card'; cardId: CardId | null }
  | { type: 'dispatch'; action: Action }
  | { type: 'claim-noble'; nobleId: NobleId }
  | { type: 'restart' }
  | { type: 'set-error'; error: RuleError }

function createSession(seed: number): SessionState {
  return {
    state: createInitialGame(seed),
    selectedCardId: null,
    lastError: null,
  }
}

function sessionReducer(session: SessionState, action: SessionAction): SessionState {
  if (action.type === 'select-card') {
    return { ...session, selectedCardId: action.cardId }
  }

  if (action.type === 'restart') {
    return createSession(nextRandom(session.state.randomSeed).seed)
  }

  if (action.type === 'set-error') {
    return { ...session, lastError: action.error }
  }

  const result =
    action.type === 'dispatch'
      ? applyAction(session.state, action.action)
      : claimNobleAction(
          session.state,
          session.state.players.find((player) => player.isHuman)?.id ?? 'human',
          action.nobleId,
        )

  if (!result.ok) {
    return { ...session, lastError: result.error }
  }

  return {
    ...session,
    state: result.value,
    lastError: null,
  }
}

export interface GameSession {
  state: GameState
  selectedCardId: CardId | null
  lastError: RuleError | null
  selectCard(cardId: CardId | null): void
  dispatch(action: Action): void
  claimNoble(nobleId: NobleId): void
  restart(): void
  pendingNobleIds: NobleId[]
}

export function useGameSession(seed = DEFAULT_SEED): GameSession {
  const [session, updateSession] = useReducer(sessionReducer, seed, createSession)
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearAiTimer = () => {
    if (aiTimerRef.current === null) return

    clearTimeout(aiTimerRef.current)
    aiTimerRef.current = null
  }

  useEffect(() => {
    clearAiTimer()

    const currentPlayer = session.state.players[session.state.currentPlayerIndex]
    if (
      session.state.phase === 'finished' ||
      session.state.pendingNobleIds.length > 0 ||
      !currentPlayer ||
      currentPlayer.isHuman
    ) {
      return
    }

    let cancelled = false
    const timer = setTimeout(() => {
      aiTimerRef.current = null
      if (cancelled) return

      try {
        const action = chooseAiAction(session.state, currentPlayer.id)
        updateSession({ type: 'dispatch', action })
      } catch (error) {
        updateSession({
          type: 'set-error',
          error: {
            code: 'AI_ACTION_FAILED',
            message: error instanceof Error ? error.message : 'The computer player could not act.',
          },
        })
      }
    }, AI_TURN_DELAY_MS)

    aiTimerRef.current = timer

    return () => {
      cancelled = true
      clearTimeout(timer)
      if (aiTimerRef.current === timer) {
        aiTimerRef.current = null
      }
    }
  }, [session.state])

  return {
    state: session.state,
    selectedCardId: session.selectedCardId,
    lastError: session.lastError,
    selectCard: (cardId) => updateSession({ type: 'select-card', cardId }),
    dispatch: (action) => updateSession({ type: 'dispatch', action }),
    claimNoble: (nobleId) => updateSession({ type: 'claim-noble', nobleId }),
    restart: () => {
      clearAiTimer()
      updateSession({ type: 'restart' })
    },
    pendingNobleIds: session.state.pendingNobleIds,
  }
}
