import { existsSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ASSET_PATHS } from './assets'
import { ASSET_SOURCES } from './asset-sources'
import { CARDS } from './cards'
import { NOBLES } from './nobles'

const WEB_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const PUBLIC_ROOT = resolve(WEB_ROOT, 'web', 'public')

function assetFileOnDisk(path: string): string {
  return resolve(PUBLIC_ROOT, path.replace(/^\//, ''))
}

test('every ASSET_PATHS value resolves to an existing non-empty file under web/public', () => {
  const keys = Object.keys(ASSET_PATHS)
  expect(keys.length).toBe(100)

  for (const key of keys) {
    const assetPath = ASSET_PATHS[key]
    expect(assetPath).toBeDefined()
    expect(assetPath).toMatch(/^\/assets\/pokemon\/.+\.png$/)

    const file = assetFileOnDisk(assetPath)
    expect(file.startsWith(PUBLIC_ROOT)).toBe(true)
    expect(existsSync(file)).toBe(true)
    expect(statSync(file).size).toBeGreaterThan(0)
  }
})

test('every card and noble imageKey is present in ASSET_PATHS', () => {
  const keys = new Set(Object.keys(ASSET_PATHS))
  for (const card of CARDS) {
    expect(keys.has(card.imageKey)).toBe(true)
  }
  for (const noble of NOBLES) {
    expect(keys.has(noble.imageKey)).toBe(true)
  }
})

test('ASSET_SOURCES records a source for every ASSET_PATHS entry and nothing else', () => {
  expect(new Set(Object.keys(ASSET_SOURCES))).toEqual(new Set(Object.keys(ASSET_PATHS)))

  for (const url of Object.values(ASSET_SOURCES)) {
    expect(url).toMatch(/^https:\/\//)
  }
})

test('ASSET_PATHS has no stale keys beyond the 90 cards and 10 trainers', () => {
  const expected = new Set([
    ...CARDS.map((card) => card.imageKey),
    ...NOBLES.map((noble) => noble.imageKey),
  ])
  for (const key of Object.keys(ASSET_PATHS)) {
    expect(expected.has(key)).toBe(true)
  }
})
