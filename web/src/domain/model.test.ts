import {
  ALL_TOKEN_COLORS,
  STANDARD_TOKEN_COLORS,
} from './model'
import {
  addTokens,
  canAfford,
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
