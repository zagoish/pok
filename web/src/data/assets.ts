const pokemonAssetPaths = Array.from({ length: 90 }, (_, index) => {
  const number = String(index + 1).padStart(3, '0')
  return [`pokemon-${number}`, `/assets/pokemon/pokemon-${number}.png`] as const
})

const trainerAssetPaths = Array.from({ length: 10 }, (_, index) => {
  const number = String(index + 1).padStart(3, '0')
  return [`trainer-${number}`, `/assets/pokemon/trainer-${number}.png`] as const
})

export const ASSET_PATHS: Record<string, string> = Object.fromEntries([
  ...pokemonAssetPaths,
  ...trainerAssetPaths,
])
