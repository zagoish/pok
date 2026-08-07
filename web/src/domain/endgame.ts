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
