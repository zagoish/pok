export function nextRandom(seed: number): { seed: number; value: number } {
  const next = (seed * 1664525 + 1013904223) >>> 0
  return { seed: next, value: next / 2 ** 32 }
}

export function shuffleWithSeed<T>(items: readonly T[], seed: number): { items: T[]; seed: number } {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const random = nextRandom(seed)
    seed = random.seed
    const swapIndex = Math.floor(random.value * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }

  return { items: shuffled, seed }
}
