import { CARDS } from '../data/cards'
import { addTokens, subtractTokens, zeroTokenInventory } from './inventory'
import { getPaymentBreakdown } from './payment'
import {
  type Action,
  type GameState,
  type RuleResult,
  type Tier,
} from './model'
import { validateAction } from './action-legality'
import { claimNoble, getEligibleNobles, selectNobleForComputer } from './nobles'
import { resolveGameEnd, startFinalRound } from './endgame'

function removeFromMarketAndRefill(
  market: GameState['market'],
  decks: GameState['decks'],
  tier: Tier,
  cardId: string,
): void {
  market[tier] = market[tier].filter((id) => id !== cardId)

  const replacement = decks[tier].shift()
  if (replacement !== undefined) {
    market[tier].push(replacement)
  }
}

export function applyAction(state: GameState, action: Action): RuleResult<GameState> {
  const validation = validateAction(state, action)
  if (!validation.ok) {
    return validation
  }

  const players = state.players.map((player) => ({
    ...player,
    tokens: { ...player.tokens },
    bonuses: { ...player.bonuses },
    purchasedCards: [...player.purchasedCards],
    reservedCards: [...player.reservedCards],
    nobles: [...player.nobles],
  }))
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
  const availableNobles = [...state.availableNobles]
  const winnerIds = [...state.winnerIds]
  const eventLog = state.eventLog.map((event) => ({ ...event }))
  const currentPlayer = players[state.currentPlayerIndex]
  const takenTokens = zeroTokenInventory()
  let tokenBank = { ...state.tokenBank }
  let message: string

  if (action.type === 'take-three-different') {
    for (const color of action.colors) {
      takenTokens[color] += 1
    }
    tokenBank = subtractTokens(state.tokenBank, takenTokens)
    players[state.currentPlayerIndex] = {
      ...currentPlayer,
      tokens: addTokens(currentPlayer.tokens, takenTokens),
    }
    message = `${currentPlayer.name} took one token of each: ${action.colors.join(', ')}.`
  } else if (action.type === 'take-two-same') {
    takenTokens[action.color] = 2
    tokenBank = subtractTokens(state.tokenBank, takenTokens)
    players[state.currentPlayerIndex] = {
      ...currentPlayer,
      tokens: addTokens(currentPlayer.tokens, takenTokens),
    }
    message = `${currentPlayer.name} took two ${action.color} tokens.`
  } else if (action.type === 'buy-card') {
    const card = CARDS.find((candidate) => candidate.id === action.cardId)
    if (!card) {
      return {
        ok: false,
        error: {
          code: 'CARD_NOT_AVAILABLE',
          message: 'The requested card is not available.',
        },
      }
    }

    const payment = getPaymentBreakdown(card, currentPlayer).payment
    tokenBank = addTokens(state.tokenBank, payment)
    players[state.currentPlayerIndex] = {
      ...currentPlayer,
      tokens: subtractTokens(currentPlayer.tokens, payment),
      bonuses: {
        ...currentPlayer.bonuses,
        [card.bonusType]: currentPlayer.bonuses[card.bonusType] + 1,
      },
      purchasedCards: [...currentPlayer.purchasedCards, card.id],
      reservedCards:
        action.source === 'reserved'
          ? currentPlayer.reservedCards.filter((reservedCardId) => reservedCardId !== card.id)
          : [...currentPlayer.reservedCards],
      points: currentPlayer.points + card.points,
    }

    if (action.source === 'market') {
      removeFromMarketAndRefill(market, decks, card.tier, card.id)
    }

    message = `${currentPlayer.name} bought ${card.name}.`
  } else {
    const card = CARDS.find((candidate) => candidate.id === action.cardId)
    if (!card) {
      return {
        ok: false,
        error: {
          code: 'CARD_NOT_AVAILABLE',
          message: 'The requested card is not available.',
        },
      }
    }

    const reservedTokens = zeroTokenInventory()
    if (state.tokenBank.rainbow > 0) {
      reservedTokens.rainbow = 1
    }
    tokenBank = subtractTokens(state.tokenBank, reservedTokens)
    players[state.currentPlayerIndex] = {
      ...currentPlayer,
      tokens: addTokens(currentPlayer.tokens, reservedTokens),
      reservedCards: [...currentPlayer.reservedCards, card.id],
    }
    removeFromMarketAndRefill(market, decks, action.tier, card.id)
    message = `${currentPlayer.name} reserved ${card.name}.`
  }

  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length
  const nextRound =
    nextPlayerIndex === state.startingPlayerIndex ? state.round + 1 : state.round

  eventLog.push({
    type: action.type,
    playerId: action.playerId,
    message,
  })

  let nextState: GameState = {
    ...state,
    players,
    decks,
    market,
    availableNobles,
    pendingNobleIds: [],
    pendingNoblePlayerId: null,
    winnerIds,
    tokenBank,
    eventLog,
    currentPlayerIndex: state.currentPlayerIndex,
    round: state.round,
  }

  if (action.type === 'buy-card' && players[state.currentPlayerIndex].points >= 15) {
    nextState = startFinalRound(nextState, state.currentPlayerIndex)
  }

  if (action.type === 'buy-card') {
    const eligibleNobles = getEligibleNobles(nextState, action.playerId)

    if (eligibleNobles.length > 1) {
      const purchaser = nextState.players[state.currentPlayerIndex]
      const pendingState = {
        ...nextState,
        pendingNobleIds: eligibleNobles,
        pendingNoblePlayerId: action.playerId,
      }

      if (purchaser.isHuman) {
        return { ok: true, value: pendingState }
      }

      const selection = selectNobleForComputer(nextState, eligibleNobles)
      return claimNoble(
        { ...pendingState, randomSeed: selection.randomSeed },
        action.playerId,
        selection.nobleId,
      )
    }

    if (eligibleNobles.length === 1) {
      return claimNoble(
        {
          ...nextState,
          pendingNobleIds: eligibleNobles,
          pendingNoblePlayerId: action.playerId,
        },
        action.playerId,
        eligibleNobles[0],
      )
    }
  }

  return {
    ok: true,
    value: resolveGameEnd({
      ...nextState,
      currentPlayerIndex: nextPlayerIndex,
      round: nextRound,
    }),
  }
}
