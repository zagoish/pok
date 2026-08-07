import { getLegalActions } from './action-legality'
import type { GameState, PlayerId } from './model'

export interface GameEndResult {
  phase: GameState['phase']
  winnerIds: PlayerId[]
  finalRoundStartIndex: number | null
}

export function sortPlayersForStandings(players: GameState['players']) {
  return [...players].sort((left, right) => {
    const pointsDifference = right.points - left.points
    if (pointsDifference !== 0) return pointsDifference

    return left.purchasedCards.length - right.purchasedCards.length
  })
}

function getWinnerIds(state: GameState): PlayerId[] {
  const ranking = sortPlayersForStandings(state.players)
  const topPlayer = ranking[0]

  if (!topPlayer) return []

  return ranking
    .filter(
      (player) =>
        player.points === topPlayer.points &&
        player.purchasedCards.length === topPlayer.purchasedCards.length,
    )
    .map((player) => player.id)
}

export function checkGameEnd(state: GameState): GameEndResult {
  if (
    state.phase === 'finished' ||
    (state.phase === 'final-round' &&
      state.pendingNobleIds.length === 0 &&
      state.finalRoundStartIndex !== null &&
      state.currentPlayerIndex === state.finalRoundStartIndex)
  ) {
    return {
      phase: 'finished',
      winnerIds: getWinnerIds(state),
      finalRoundStartIndex: state.finalRoundStartIndex,
    }
  }

  return {
    phase: state.phase,
    winnerIds: [...state.winnerIds],
    finalRoundStartIndex: state.finalRoundStartIndex,
  }
}

export function startFinalRound(state: GameState, playerIndex: number): GameState {
  if (state.phase === 'finished' || state.finalRoundStartIndex !== null) {
    return state
  }

  return {
    ...state,
    phase: 'final-round',
    finalRoundStartIndex: playerIndex,
  }
}

export function resolveGameEnd(state: GameState): GameState {
  const result = checkGameEnd(state)

  return {
    ...state,
    phase: result.phase,
    winnerIds: [...result.winnerIds],
    finalRoundStartIndex: result.finalRoundStartIndex,
  }
}

export function advanceTurnWithSkips(state: GameState): GameState {
  let current = state

  for (let advanced = 0; advanced < current.players.length; advanced += 1) {
    if (current.phase === 'finished' || current.pendingNobleIds.length > 0) return current

    const player = current.players[current.currentPlayerIndex]
    if (getLegalActions(current, player.id).length > 0) return current

    const nextIndex = (current.currentPlayerIndex + 1) % current.players.length
    const nextRound = nextIndex === current.startingPlayerIndex ? current.round + 1 : current.round

    current = resolveGameEnd({
      ...current,
      currentPlayerIndex: nextIndex,
      round: nextRound,
      eventLog: [
        ...current.eventLog,
        {
          type: 'skip',
          playerId: player.id,
          message: `${player.name} had no legal actions and passed.`,
        },
      ],
    })
  }

  return {
    ...resolveGameEnd(current),
    phase: 'finished',
    winnerIds: getWinnerIds(current),
  }
}
