import {
  ALL_TOKEN_COLORS,
  STANDARD_TOKEN_COLORS,
  type BonusInventory,
  type CardCost,
  type TokenInventory,
} from './model'

export function zeroTokenInventory(): TokenInventory {
  return {
    fire: 0,
    water: 0,
    grass: 0,
    electric: 0,
    psychic: 0,
    rainbow: 0,
  }
}

export function zeroBonusInventory(): BonusInventory {
  return {
    fire: 0,
    water: 0,
    grass: 0,
    electric: 0,
    psychic: 0,
  }
}

export function addTokens(inventory: TokenInventory, tokens: TokenInventory): TokenInventory {
  const result = zeroTokenInventory()

  for (const color of ALL_TOKEN_COLORS) {
    result[color] = inventory[color] + tokens[color]
  }

  return result
}

export function subtractTokens(inventory: TokenInventory, tokens: TokenInventory): TokenInventory {
  const result = zeroTokenInventory()

  for (const color of ALL_TOKEN_COLORS) {
    result[color] = inventory[color] - tokens[color]
  }

  return result
}

export function totalTokens(inventory: TokenInventory): number {
  return ALL_TOKEN_COLORS.reduce((total, color) => total + inventory[color], 0)
}

export function discardTokensToLimit(tokens: TokenInventory, limit: number): TokenInventory {
  let total = totalTokens(tokens)
  if (total <= limit) return { ...tokens }

  const result = { ...tokens }

  while (total > limit) {
    const mostHeld = STANDARD_TOKEN_COLORS.reduce(
      (chosen, color) => (result[color] > result[chosen] ? color : chosen),
      STANDARD_TOKEN_COLORS[0],
    )

    if (result[mostHeld] > 0) {
      result[mostHeld] -= 1
    } else {
      result.rainbow -= 1
    }
    total -= 1
  }

  return result
}

export function canAfford(cost: CardCost, bonuses: BonusInventory, tokens: TokenInventory): boolean {
  let rainbowTokens = tokens.rainbow

  for (const color of STANDARD_TOKEN_COLORS) {
    const deficit = Math.max(0, cost[color] - bonuses[color] - tokens[color])
    rainbowTokens -= deficit
  }

  return rainbowTokens >= 0
}
