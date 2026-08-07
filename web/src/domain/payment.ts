import { STANDARD_TOKEN_COLORS, type Card, type PlayerState, type StandardTokenColor, type TokenInventory } from './model'
import { zeroTokenInventory } from './inventory'

export type PaymentPlayer = Pick<PlayerState, 'bonuses' | 'tokens'>

export interface PaymentBreakdownRow {
  color: StandardTokenColor
  total: number
  afterBonus: number
  tokenPayment: number
}

export interface PaymentBreakdown {
  payment: TokenInventory
  rainbowPayment: number
  rows: PaymentBreakdownRow[]
}

export function calculatePayment(card: Card, player: PaymentPlayer): TokenInventory {
  const payment = zeroTokenInventory()

  for (const color of STANDARD_TOKEN_COLORS) {
    const remainingCost = Math.max(0, card.cost[color] - player.bonuses[color])
    payment[color] = Math.min(player.tokens[color], remainingCost)
    payment.rainbow += remainingCost - payment[color]
  }

  return payment
}

export function getPaymentBreakdown(card: Card, player: PaymentPlayer): PaymentBreakdown {
  const payment = calculatePayment(card, player)

  return {
    payment,
    rainbowPayment: payment.rainbow,
    rows: STANDARD_TOKEN_COLORS.filter((color) => card.cost[color] > 0).map((color) => ({
      color,
      total: card.cost[color],
      afterBonus: Math.max(0, card.cost[color] - player.bonuses[color]),
      tokenPayment: payment[color],
    })),
  }
}
