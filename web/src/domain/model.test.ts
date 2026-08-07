import {
  ALL_TOKEN_COLORS,
  STANDARD_TOKEN_COLORS,
  type TokenInventory,
} from './model'
import {
  addTokens,
  canAfford,
  discardTokensToLimit,
  subtractTokens,
  totalTokens,
  zeroBonusInventory,
  zeroTokenInventory,
} from './inventory'

test('defines the standard and rainbow token colors', () => {
  expect(STANDARD_TOKEN_COLORS).toEqual([
    'fire',
    'water',
    'grass',
    'electric',
    'psychic',
  ])
  expect(ALL_TOKEN_COLORS).toEqual([
    'fire',
    'water',
    'grass',
    'electric',
    'psychic',
    'rainbow',
  ])
})

test('keeps inventory inputs unchanged when adding and subtracting tokens', () => {
  const inventory = { ...zeroTokenInventory(), fire: 2, water: 1 }
  const tokens = { ...zeroTokenInventory(), fire: 1, grass: 3 }

  const added = addTokens(inventory, tokens)
  const subtracted = subtractTokens(added, tokens)

  expect(inventory).toEqual({
    fire: 2,
    water: 1,
    grass: 0,
    electric: 0,
    psychic: 0,
    rainbow: 0,
  })
  expect(tokens).toEqual({
    fire: 1,
    water: 0,
    grass: 3,
    electric: 0,
    psychic: 0,
    rainbow: 0,
  })
  expect(added).toEqual({
    fire: 3,
    water: 1,
    grass: 3,
    electric: 0,
    psychic: 0,
    rainbow: 0,
  })
  expect(subtracted).toEqual(inventory)
})

test('counts rainbow tokens in the total token count', () => {
  const inventory = {
    ...zeroTokenInventory(),
    fire: 2,
    water: 1,
    rainbow: 3,
  }

  expect(totalTokens(inventory)).toBe(6)
})

test('uses permanent bonuses before rainbow tokens when checking affordability', () => {
  const cost = {
    ...zeroBonusInventory(),
    fire: 3,
    water: 2,
  }
  const bonuses = { ...zeroBonusInventory(), fire: 2 }
  const tokens = { ...zeroTokenInventory(), water: 2, rainbow: 1 }

  expect(canAfford(cost, bonuses, tokens)).toBe(true)
  expect(cost).toEqual({
    fire: 3,
    water: 2,
    grass: 0,
    electric: 0,
    psychic: 0,
  })
  expect(bonuses).toEqual({
    fire: 2,
    water: 0,
    grass: 0,
    electric: 0,
    psychic: 0,
  })
  expect(tokens).toEqual({
    fire: 0,
    water: 2,
    grass: 0,
    electric: 0,
    psychic: 0,
    rainbow: 1,
  })
})

test('discards the most-held standard tokens first when trimming to the limit', () => {
  const tokens = {
    ...zeroTokenInventory(),
    fire: 5,
    water: 4,
    grass: 3,
    electric: 2,
    psychic: 1,
  }

  expect(discardTokensToLimit(tokens, 8)).toEqual({
    fire: 1,
    water: 2,
    grass: 2,
    electric: 2,
    psychic: 1,
    rainbow: 0,
  })
  expect(tokens).toEqual({
    fire: 5,
    water: 4,
    grass: 3,
    electric: 2,
    psychic: 1,
    rainbow: 0,
  })
})

test('leaves an inventory unchanged when it is already at or below the limit', () => {
  const tokens = {
    ...zeroTokenInventory(),
    fire: 3,
    water: 3,
    grass: 2,
    rainbow: 2,
  }

  expect(discardTokensToLimit(tokens, 10)).toEqual(tokens)
  expect(discardTokensToLimit(tokens, 11)).toEqual(tokens)
})

test('discards rainbow tokens as a last resort when no standard tokens remain', () => {
  expect(discardTokensToLimit({ ...zeroTokenInventory(), rainbow: 7 }, 5)).toEqual({
    fire: 0,
    water: 0,
    grass: 0,
    electric: 0,
    psychic: 0,
    rainbow: 5,
  })

  const mixed = {
    ...zeroTokenInventory(),
    water: 4,
    rainbow: 3,
  }
  expect(discardTokensToLimit(mixed, 5)).toEqual({
    fire: 0,
    water: 2,
    grass: 0,
    electric: 0,
    psychic: 0,
    rainbow: 3,
  })
})

test('discardTokensToLimit always lands at or below the limit and only removes tokens', () => {
  const cases: Array<{ tokens: Partial<TokenInventory>; limit: number }> = [
    { tokens: { fire: 4, water: 3, grass: 2, electric: 1 }, limit: 10 },
    { tokens: { fire: 9, rainbow: 4 }, limit: 10 },
    { tokens: { rainbow: 7 }, limit: 5 },
    { tokens: { water: 2, psychic: 3, rainbow: 5 }, limit: 10 },
    { tokens: { fire: 10 }, limit: 0 },
    { tokens: { fire: 1, water: 1, grass: 1, electric: 1, psychic: 1, rainbow: 5 }, limit: 7 },
  ]

  for (const { tokens, limit } of cases) {
    const input = { ...zeroTokenInventory(), ...tokens }
    const result = discardTokensToLimit(input, limit)

    expect(totalTokens(result)).toBeLessThanOrEqual(limit)
    for (const color of ALL_TOKEN_COLORS) {
      expect(result[color]).toBeGreaterThanOrEqual(0)
      expect(result[color]).toBeLessThanOrEqual(input[color])
    }
    expect(input).toEqual({ ...zeroTokenInventory(), ...tokens })
  }
})
