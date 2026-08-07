import { CARDS } from '../data/cards'
import {
  STANDARD_TOKEN_COLORS,
  type Action,
  type Card,
  type GameState,
  type PlayerId,
  type RuleResult,
  type StandardTokenColor,
  type Tier,
} from './model'
import { canAfford } from './inventory'

function ruleError(code: string, message: string): RuleResult {
  return { ok: false, error: { code, message } }
}

function validAction(): RuleResult {
  return { ok: true, value: undefined }
}

function findCard(cardId: string): Card | undefined {
  return CARDS.find((card) => card.id === cardId)
}

function isVisibleInTier(state: GameState, card: Card, tier: Tier): boolean {
  return card.tier === tier && state.market[tier].includes(card.id)
}

export function getLegalActions(state: GameState, playerId: PlayerId): Action[] {
  const currentPlayer = state.players[state.currentPlayerIndex]

  if (state.phase === 'finished' || !currentPlayer || currentPlayer.id !== playerId) {
    return []
  }

  const actions: Action[] = []

  for (let firstIndex = 0; firstIndex < STANDARD_TOKEN_COLORS.length - 2; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < STANDARD_TOKEN_COLORS.length - 1;
      secondIndex += 1
    ) {
      for (
        let thirdIndex = secondIndex + 1;
        thirdIndex < STANDARD_TOKEN_COLORS.length;
        thirdIndex += 1
      ) {
        const action: Action = {
          type: 'take-three-different',
          playerId,
          colors: [
            STANDARD_TOKEN_COLORS[firstIndex],
            STANDARD_TOKEN_COLORS[secondIndex],
            STANDARD_TOKEN_COLORS[thirdIndex],
          ] as [StandardTokenColor, StandardTokenColor, StandardTokenColor],
        }

        if (validateAction(state, action).ok) {
          actions.push(action)
        }
      }
    }
  }

  const lowBank = STANDARD_TOKEN_COLORS.filter((color) => state.tokenBank[color] >= 1).length < 3
  const sameColorMinimum = lowBank ? 2 : 4

  for (const color of STANDARD_TOKEN_COLORS) {
    if (state.tokenBank[color] < sameColorMinimum) continue
    const action: Action = { type: 'take-two-same', playerId, color }

    if (validateAction(state, action).ok) {
      actions.push(action)
    }
  }

  for (const tier of [1, 2, 3] as const) {
    for (const cardId of state.market[tier]) {
      const buyAction: Action = { type: 'buy-card', playerId, cardId, source: 'market' }
      if (validateAction(state, buyAction).ok) {
        actions.push(buyAction)
      }

      const reserveAction: Action = { type: 'reserve-card', playerId, cardId, tier }
      if (validateAction(state, reserveAction).ok) {
        actions.push(reserveAction)
      }
    }
  }

  for (const cardId of currentPlayer.reservedCards) {
    const action: Action = { type: 'buy-card', playerId, cardId, source: 'reserved' }
    if (validateAction(state, action).ok) {
      actions.push(action)
    }
  }

  return actions
}

export function validateAction(state: GameState, action: Action): RuleResult {
  if (state.phase === 'finished') {
    return ruleError('GAME_FINISHED', 'The game has already finished.')
  }

  if (state.pendingNobleIds.length > 0) {
    return ruleError('PENDING_NOBLE', 'The pending noble choice must be resolved first.')
  }

  const currentPlayer = state.players[state.currentPlayerIndex]
  if (!currentPlayer) {
    return ruleError('INVALID_STATE', 'The current player does not exist.')
  }

  if (action.playerId !== currentPlayer.id) {
    return ruleError('NOT_CURRENT_PLAYER', 'Only the current player may act.')
  }

  switch (action.type) {
    case 'take-three-different': {
      if (new Set(action.colors).size !== action.colors.length) {
        return ruleError('DUPLICATE_COLORS', 'Three different colors are required.')
      }

      if (action.colors.some((color) => state.tokenBank[color] < 1)) {
        return ruleError('INSUFFICIENT_BANK', 'The bank does not have the requested tokens.')
      }

      return validAction()
    }
    case 'take-two-same': {
      const lowBank = STANDARD_TOKEN_COLORS.filter((color) => state.tokenBank[color] >= 1).length < 3
      const minimum = lowBank ? 2 : 4

      if (state.tokenBank[action.color] < minimum) {
        return ruleError('INSUFFICIENT_BANK', 'The bank must contain enough tokens of that color.')
      }

      return validAction()
    }
    case 'buy-card': {
      const card = findCard(action.cardId)
      if (!card) {
        return ruleError('CARD_NOT_AVAILABLE', 'The requested card is not available.')
      }

      if (
        action.source === 'market'
          ? !isVisibleInTier(state, card, card.tier)
          : !currentPlayer.reservedCards.includes(action.cardId)
      ) {
        return ruleError('CARD_NOT_AVAILABLE', 'The requested card is not available.')
      }

      if (!canAfford(card.cost, currentPlayer.bonuses, currentPlayer.tokens)) {
        return ruleError('CANNOT_AFFORD', 'The player cannot afford this card.')
      }

      return validAction()
    }
    case 'reserve-card': {
      const card = findCard(action.cardId)
      if (!card || !isVisibleInTier(state, card, action.tier)) {
        return ruleError('CARD_NOT_AVAILABLE', 'The requested card is not available.')
      }

      if (currentPlayer.reservedCards.length >= 3) {
        return ruleError('RESERVE_LIMIT', 'A player cannot reserve more than three cards.')
      }

      return validAction()
    }
  }
}
