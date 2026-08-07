import { CARDS } from '../data/cards'
import { NOBLES } from '../data/nobles'
import { applyAction } from '../domain/action-apply'
import { getLegalActions } from '../domain/action-legality'
import { getEligibleNobles } from '../domain/nobles'
import { nextRandom } from '../domain/random'
import {
  STANDARD_TOKEN_COLORS,
  type Action,
  type Card,
  type GameState,
  type PlayerId,
  type PlayerState,
  type StandardTokenColor,
} from '../domain/model'

interface Score {
  primary: number
  secondary: number
  tertiary: number
  quaternary: number
}

function findCard(cardId: string): Card | undefined {
  return CARDS.find((card) => card.id === cardId)
}

function findPlayer(state: GameState, playerId: PlayerId): PlayerState | undefined {
  return state.players.find((player) => player.id === playerId)
}

function compareScores(left: Score, right: Score): number {
  if (left.primary !== right.primary) return left.primary > right.primary ? 1 : -1
  if (left.secondary !== right.secondary) return left.secondary > right.secondary ? 1 : -1
  if (left.tertiary !== right.tertiary) return left.tertiary > right.tertiary ? 1 : -1
  if (left.quaternary !== right.quaternary) return left.quaternary > right.quaternary ? 1 : -1
  return 0
}

function chooseFromTies<T>(items: T[], randomSeed: number): T {
  if (items.length === 1) return items[0]

  const random = nextRandom(randomSeed)
  return items[Math.floor(random.value * items.length)] ?? items[0]
}

function chooseBest<T>(scoredItems: Array<{ value: T; score: Score }>, randomSeed: number): T | undefined {
  if (scoredItems.length === 0) return undefined

  let bestScore = scoredItems[0].score
  let bestItems = [scoredItems[0].value]

  for (let index = 1; index < scoredItems.length; index += 1) {
    const candidate = scoredItems[index]
    const comparison = compareScores(candidate.score, bestScore)

    if (comparison > 0) {
      bestScore = candidate.score
      bestItems = [candidate.value]
    } else if (comparison === 0) {
      bestItems.push(candidate.value)
    }
  }

  return chooseFromTies(bestItems, randomSeed)
}

function getTargetCards(state: GameState, playerId: PlayerId): Card[] {
  const player = findPlayer(state, playerId)
  if (!player) return []

  const targetIds: string[] = []
  for (const tier of [1, 2, 3] as const) {
    targetIds.push(...state.market[tier])
  }
  targetIds.push(...player.reservedCards)

  return targetIds
    .map((cardId) => findCard(cardId))
    .filter((card): card is Card => card !== undefined)
}

function missingCost(card: Card, player: PlayerState): number {
  let missing = 0

  for (const color of STANDARD_TOKEN_COLORS) {
    missing += Math.max(0, card.cost[color] - player.bonuses[color] - player.tokens[color])
  }

  return Math.max(0, missing - player.tokens.rainbow)
}

function usefulBonusScore(
  state: GameState,
  playerId: PlayerId,
  bonusColor: StandardTokenColor,
  targetCards: Card[],
): number {
  const player = findPlayer(state, playerId)
  if (!player) return 0

  let score = 0
  for (const card of targetCards) {
    const missing = card.cost[bonusColor] - player.bonuses[bonusColor] - player.tokens[bonusColor]
    if (missing > 0) score += 1
  }

  const eligibleNobleIds = new Set(getEligibleNobles(state, playerId))
  for (const noble of NOBLES) {
    if (!state.availableNobles.includes(noble.id) || eligibleNobleIds.has(noble.id)) continue
    if (noble.requirement[bonusColor] > player.bonuses[bonusColor]) score += 1
  }

  return score
}

function claimsNobleImmediately(state: GameState, action: Action, playerId: PlayerId): boolean {
  if (action.type !== 'buy-card') return false

  const player = findPlayer(state, playerId)
  if (!player) return false

  const result = applyAction(state, action)
  if (!result.ok) return false

  const nextPlayer = findPlayer(result.value, playerId)
  if (!nextPlayer) return false

  const eligibleBefore = getEligibleNobles(state, playerId)
  const eligibleAfter = getEligibleNobles(result.value, playerId)

  return nextPlayer.nobles.length > player.nobles.length || eligibleAfter.length < eligibleBefore.length
}

function purchaseScore(state: GameState, playerId: PlayerId, card: Card): Score {
  const targetCards = getTargetCards(state, playerId)
  const player = findPlayer(state, playerId)

  if (!player) {
    return { primary: 0, secondary: 0, tertiary: 0, quaternary: 0 }
  }

  return {
    primary: card.points,
    secondary: usefulBonusScore(state, playerId, card.bonusType, targetCards),
    tertiary: card.tier,
    quaternary: -missingCost(card, player),
  }
}

function reserveScore(state: GameState, playerId: PlayerId, card: Card): Score {
  const targetCards = getTargetCards(state, playerId)
  const player = findPlayer(state, playerId)

  if (!player) {
    return { primary: 0, secondary: 0, tertiary: 0, quaternary: 0 }
  }

  return {
    primary: card.tier,
    secondary: card.points,
    tertiary: usefulBonusScore(state, playerId, card.bonusType, targetCards),
    quaternary: -missingCost(card, player),
  }
}

function targetScore(state: GameState, playerId: PlayerId, card: Card): Score {
  const player = findPlayer(state, playerId)
  if (!player) {
    return { primary: 0, secondary: 0, tertiary: 0, quaternary: 0 }
  }

  return {
    primary: card.points,
    secondary: card.tier,
    tertiary: usefulBonusScore(state, playerId, card.bonusType, [card]),
    quaternary: -missingCost(card, player),
  }
}

function tokenCountForAction(action: Action, color: StandardTokenColor): number {
  if (action.type === 'take-two-same') return action.color === color ? 2 : 0
  if (action.type === 'take-three-different') return action.colors.includes(color) ? 1 : 0
  return 0
}

function missingCostAfterTokenAction(card: Card, player: PlayerState, action: Action): number {
  let missing = 0

  for (const color of STANDARD_TOKEN_COLORS) {
    const tokens = player.tokens[color] + tokenCountForAction(action, color)
    missing += Math.max(0, card.cost[color] - player.bonuses[color] - tokens)
  }

  return Math.max(0, missing - player.tokens.rainbow)
}

function chooseTokenAction(
  state: GameState,
  playerId: PlayerId,
  legalActions: Action[],
): Action | undefined {
  const player = findPlayer(state, playerId)
  if (!player) return undefined

  const targetCards = getTargetCards(state, playerId)
  if (targetCards.length === 0) return undefined

  const targetCard = chooseBest(
    targetCards.map((card) => ({
      value: card,
      score: targetScore(state, playerId, card),
    })),
    state.randomSeed,
  )
  if (!targetCard) return undefined

  const tokenActions = legalActions.filter(
    (action) => action.type === 'take-three-different' || action.type === 'take-two-same',
  )

  return chooseBest(
    tokenActions.map((action) => ({
      value: action,
      score: {
        primary: -missingCostAfterTokenAction(targetCard, player, action),
        secondary: 0,
        tertiary: 0,
        quaternary: 0,
      },
    })),
    state.randomSeed,
  )
}

export function chooseAiAction(state: GameState, playerId: PlayerId): Action {
  const legalActions = getLegalActions(state, playerId)
  if (legalActions.length === 0) {
    throw new Error(`NO_LEGAL_ACTIONS: no legal actions for ${playerId}`)
  }

  const noblePurchases = legalActions.filter((action) => claimsNobleImmediately(state, action, playerId))
  if (noblePurchases.length > 0) return chooseFromTies(noblePurchases, state.randomSeed)

  const purchases: Array<{ value: Action; score: Score }> = []
  for (const action of legalActions) {
    if (action.type !== 'buy-card') continue
    const card = findCard(action.cardId)
    if (card) purchases.push({ value: action, score: purchaseScore(state, playerId, card) })
  }
  const purchase = chooseBest(purchases, state.randomSeed)
  if (purchase) return purchase

  const reservations: Array<{ value: Action; score: Score }> = []
  for (const action of legalActions) {
    if (action.type !== 'reserve-card') continue
    const card = findCard(action.cardId)
    if (card) reservations.push({ value: action, score: reserveScore(state, playerId, card) })
  }
  const reservation = chooseBest(reservations, state.randomSeed)
  if (reservation) return reservation

  return chooseTokenAction(state, playerId, legalActions) ?? legalActions[0]
}
