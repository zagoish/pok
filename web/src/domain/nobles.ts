import { NOBLES } from '../data/nobles'
import { nextRandom } from './random'
import {
  STANDARD_TOKEN_COLORS,
  type GameState,
  type Noble,
  type NobleId,
  type PlayerId,
  type PlayerState,
  type RuleResult,
} from './model'
import { resolveGameEnd, startFinalRound } from './endgame'

function ruleError(code: string, message: string): RuleResult<GameState> {
  return { ok: false, error: { code, message } }
}

function findNoble(nobleId: NobleId) {
  return NOBLES.find((noble) => noble.id === nobleId)
}

function meetsRequirement(player: PlayerState, noble: Noble): boolean {
  return STANDARD_TOKEN_COLORS.every((color) => player.bonuses[color] >= noble.requirement[color])
}

function requirementTotal(noble: Noble): number {
  return STANDARD_TOKEN_COLORS.reduce((total, color) => total + noble.requirement[color], 0)
}

export function getEligibleNobles(state: GameState, playerId: PlayerId): NobleId[] {
  const player = state.players.find((candidate) => candidate.id === playerId)
  if (!player) return []

  return state.availableNobles.filter((nobleId) => {
    const noble = findNoble(nobleId)
    if (!noble) return false

    return meetsRequirement(player, noble)
  })
}

export function selectNobleForComputer(
  state: GameState,
  eligibleNobleIds: NobleId[],
): { nobleId: NobleId; randomSeed: number } {
  const eligibleNobles = eligibleNobleIds
    .map((nobleId) => findNoble(nobleId))
    .filter((noble): noble is Noble => noble !== undefined)
  const highestRequirement = Math.max(...eligibleNobles.map(requirementTotal))
  const highestNobles = eligibleNobles.filter((noble) => requirementTotal(noble) === highestRequirement)

  if (highestNobles.length === 1) {
    return { nobleId: highestNobles[0].id, randomSeed: state.randomSeed }
  }

  const random = nextRandom(state.randomSeed)
  const selectedNoble = highestNobles[Math.floor(random.value * highestNobles.length)]

  return { nobleId: selectedNoble.id, randomSeed: random.seed }
}

export function claimNoble(state: GameState, playerId: PlayerId, nobleId: NobleId): RuleResult<GameState> {
  if (state.phase === 'finished') {
    return ruleError('GAME_FINISHED', 'The game has already finished.')
  }

  if (state.pendingNoblePlayerId !== playerId) {
    return ruleError('NO_PENDING_NOBLE', 'This player has no pending noble choice.')
  }

  if (!state.pendingNobleIds.includes(nobleId)) {
    return ruleError('NOBLE_NOT_AVAILABLE', 'The requested noble is not available for this choice.')
  }

  const playerIndex = state.players.findIndex((player) => player.id === playerId)
  if (playerIndex < 0 || state.currentPlayerIndex !== playerIndex) {
    return ruleError('NOT_CURRENT_PLAYER', 'Only the current player may claim a noble.')
  }

  const noble = findNoble(nobleId)
  if (!noble || !state.availableNobles.includes(nobleId)) {
    return ruleError('NOBLE_NOT_AVAILABLE', 'The requested noble is not available.')
  }

  const player = state.players[playerIndex]
  if (!meetsRequirement(player, noble)) {
    return ruleError('NOBLE_NOT_ELIGIBLE', 'The player no longer meets this noble requirement.')
  }

  const players = state.players.map((player, index) =>
    index === playerIndex
      ? {
          ...player,
          tokens: { ...player.tokens },
          bonuses: { ...player.bonuses },
          purchasedCards: [...player.purchasedCards],
          reservedCards: [...player.reservedCards],
          nobles: [...player.nobles, noble.id],
          points: player.points + noble.points,
        }
      : {
          ...player,
          tokens: { ...player.tokens },
          bonuses: { ...player.bonuses },
          purchasedCards: [...player.purchasedCards],
          reservedCards: [...player.reservedCards],
          nobles: [...player.nobles],
        },
  )
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length
  const nextRound =
    nextPlayerIndex === state.startingPlayerIndex ? state.round + 1 : state.round
  const decks = {
    1: [...state.decks[1]],
    2: [...state.decks[2]],
    3: [...state.decks[3]],
  }
  const market = {
    1: [...state.market[1]],
    2: [...state.market[2]],
    3: [...state.market[3]],
  }
  const nextState: GameState = {
    ...state,
    players,
    decks,
    market,
    availableNobles: state.availableNobles.filter((availableNobleId) => availableNobleId !== nobleId),
    pendingNobleIds: [],
    pendingNoblePlayerId: null,
    winnerIds: [...state.winnerIds],
    tokenBank: { ...state.tokenBank },
    eventLog: [
      ...state.eventLog.map((event) => ({ ...event })),
      {
        type: 'claim-noble',
        playerId,
        message: `${state.players[playerIndex].name} claimed ${noble.name}.`,
      },
    ],
    currentPlayerIndex: nextPlayerIndex,
    round: nextRound,
  }
  const finalRoundState =
    players[playerIndex].points >= 15 ? startFinalRound(nextState, playerIndex) : nextState

  return { ok: true, value: resolveGameEnd(finalRoundState) }
}
