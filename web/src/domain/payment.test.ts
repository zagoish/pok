import { expect, test } from 'vitest'
import { CARDS } from '../data/cards'
import { zeroBonusInventory, zeroTokenInventory } from './inventory'
import { calculatePayment, getPaymentBreakdown } from './payment'

test('calculates payment after permanent bonuses, colored tokens, and rainbow tokens', () => {
  const card = CARDS.find((candidate) => candidate.id === 'tier-1-002')
  if (!card) throw new Error('Missing payment fixture card')

  const bonuses = zeroBonusInventory()
  bonuses.fire = 1
  const tokens = zeroTokenInventory()
  tokens.fire = 1
  tokens.rainbow = 1
  const player = { bonuses, tokens }

  expect(calculatePayment(card, player)).toEqual({
    fire: 1,
    water: 0,
    grass: 0,
    electric: 0,
    psychic: 0,
    rainbow: 1,
  })

  expect(getPaymentBreakdown(card, player)).toMatchObject({
    rainbowPayment: 1,
    rows: [
      { color: 'fire', total: 2, afterBonus: 1, tokenPayment: 1 },
      { color: 'psychic', total: 1, afterBonus: 1, tokenPayment: 0 },
    ],
  })
})
