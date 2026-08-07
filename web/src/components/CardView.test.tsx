import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { CARDS } from '../data/cards'
import type { Card } from '../domain/model'
import CardView from './CardView'

function cardById(id: string): Card {
  const card = CARDS.find((candidate) => candidate.id === id)
  if (!card) throw new Error(`Missing card ${id}`)
  return card
}

function renderCard(id: string) {
  const card = cardById(id)
  const utils = render(<CardView card={card} selected={false} selectCard={() => undefined} />)
  return { card, ...utils }
}

test('renders no points badge and no points pokeballs for a zero-point card', () => {
  const { container } = renderCard('tier-1-002')
  expect(container.querySelector('.card-view__points')).toBeNull()
  expect(container.querySelectorAll('.pokeball--points')).toHaveLength(0)
})

test('renders a numeric score on a four-point card', () => {
  const { container, card } = renderCard('tier-3-001')
  expect(card.points).toBe(4)
  const points = container.querySelector('.card-view__points')
  expect(points).not.toBeNull()
  expect(points?.querySelector('.card-view__points-value')?.textContent).toBe('4')
  expect(points?.querySelectorAll('.pokeball')).toHaveLength(0)
})

test('renders a numeric score on a five-point card', () => {
  const { container, card } = renderCard('tier-3-002')
  expect(card.points).toBe(5)
  const points = container.querySelector('.card-view__points')
  expect(points).not.toBeNull()
  expect(points?.querySelector('.card-view__points-value')?.textContent).toBe('5')
  expect(points?.querySelectorAll('.pokeball')).toHaveLength(0)
})

test('artwork fills the lower card face without the old framed art block', () => {
  const { container } = renderCard('tier-1-002')

  const art = container.querySelector('.card-view__art')
  expect(art).not.toBeNull()
  expect(art?.querySelector('img')).not.toBeNull()
  expect(art?.querySelector('img')).toHaveAttribute('alt', '')

  const footer = container.querySelector('.card-view__footer')
  expect(footer).not.toBeNull()
  expect(footer?.querySelector('.card-view__name')).not.toBeNull()
  expect(footer?.querySelector('.card-view__costs')).not.toBeNull()
})

test('places name and every cost chip inside the bottom footer scrim', () => {
  const { container } = renderCard('tier-1-002')

  const footer = container.querySelector('.card-view__footer')
  expect(footer?.querySelector('.card-view__name')?.textContent).toBe('Charmander')
  expect(container.querySelectorAll('.card-view__footer .cost-chip')).toHaveLength(2)
  expect(footer?.querySelector('.cost-chip--fire')).not.toBeNull()
})

test('renders the tier pokeball variant class and no visible tier digits for tiers 1, 2 and 3', () => {
  const t1 = renderCard('tier-1-002')
  expect(t1.container.querySelector('.pokeball--tier-1')).not.toBeNull()
  expect(t1.container.querySelector('.card-view__tier-label')).toBeNull()
  expect(t1.container.querySelector('.card-view__tier')?.textContent).toBe('')
  expect(t1.container.querySelector('button')).toHaveAttribute('data-tier', '1')

  const t2 = renderCard('tier-2-002')
  expect(t2.container.querySelector('.pokeball--tier-2')).not.toBeNull()
  expect(t2.container.querySelector('.card-view__tier-label')).toBeNull()
  expect(t2.container.querySelector('.card-view__tier')?.textContent).toBe('')
  expect(t2.container.querySelector('button')).toHaveAttribute('data-tier', '2')

  const t3 = renderCard('tier-3-001')
  expect(t3.container.querySelector('.pokeball--tier-3')).not.toBeNull()
  expect(t3.container.querySelector('.card-view__tier-label')).toBeNull()
  expect(t3.container.querySelector('.card-view__tier')?.textContent).toBe('')
  expect(t3.container.querySelector('button')).toHaveAttribute('data-tier', '3')
})

test('stacks the bonus badge above the tier pokeball in the meta column', () => {
  const { container } = renderCard('tier-1-002')

  const meta = container.querySelector('.card-view__meta')
  expect(meta).not.toBeNull()
  const children = Array.from(meta?.children ?? [])
  expect(children.map((node) => node.className)).toEqual(['card-view__bonus', 'card-view__tier'])
})

test('renders the bonus dot inside the top line, not in a bottom row', () => {
  const { container } = renderCard('tier-1-002')

  const bonus = container.querySelector('.card-view__topline .card-view__bonus')
  expect(bonus).not.toBeNull()
  expect(bonus?.querySelector('.token-dot.token-dot--electric')).not.toBeNull()
  expect(container.querySelectorAll('.card-view__bonus')).toHaveLength(1)
})

test('shows a visible single-character label on the bonus badge for every bonus color', () => {
  const shortLabels: Record<string, string> = {
    fire: '火',
    water: '水',
    grass: '草',
    electric: '电',
    psychic: '超',
  }

  for (const card of CARDS) {
    const { container } = renderCard(card.id)
    const label = container.querySelector('.card-view__bonus .card-view__bonus-label')
    expect(label, `bonus label for ${card.id}`).not.toBeNull()
    expect(label?.textContent).toBe(shortLabels[card.bonusType])
  }
})

test('every point-bearing card renders a numeric score with a matching data-count', () => {
  for (const card of CARDS) {
    const { container } = renderCard(card.id)
    const points = container.querySelector('.card-view__points')
    expect(container.querySelectorAll('.card-view__points .pokeball')).toHaveLength(0)
    if (card.points > 0) {
      expect(points, `points badge for ${card.id}`).not.toBeNull()
      expect(points?.querySelector('.card-view__points-value')?.textContent, card.id).toBe(
        String(card.points),
      )
      expect(points).toHaveAttribute('data-count', String(card.points))
    } else {
      expect(points, `points badge for ${card.id}`).toBeNull()
    }
  }
})

test('free cards share the same size hooks as cost cards', () => {
  const freeCard: Card = {
    tier: 1,
    id: 'free-test',
    name: 'Freebie',
    imageKey: 'pokemon-001',
    points: 0,
    bonusType: 'fire',
    cost: { fire: 0, water: 0, grass: 0, electric: 0, psychic: 0 },
  }
  const paid = renderCard('tier-1-002')
  const free = render(<CardView card={freeCard} selected={false} selectCard={() => undefined} />)

  const paidButton = paid.container.querySelector('button')
  const freeButton = free.container.querySelector('button')
  expect(paidButton?.className).toBe(freeButton?.className)
  expect(freeButton?.className).not.toContain('free')

  for (const selector of [
    '.card-view__topline',
    '.card-view__meta',
    '.card-view__bonus',
    '.card-view__tier',
    '.card-view__art',
    '.card-view__footer',
    '.card-view__name',
    '.card-view__costs',
  ]) {
    expect(paid.container.querySelector(selector), `paid ${selector}`).not.toBeNull()
    expect(free.container.querySelector(selector), `free ${selector}`).not.toBeNull()
  }

  const freeChip = free.container.querySelector('.cost-chip--free')
  expect(freeChip?.classList.contains('cost-chip')).toBe(true)
  expect(freeChip?.textContent).toBe('免费')
  expect(free.container.querySelectorAll('.card-view__footer .cost-chip')).toHaveLength(1)
})

test('keeps name, tier, points, bonus, and every non-zero cost in the accessible label', () => {
  const { card } = renderCard('tier-1-002')

  const cardButton = screen.getByRole('button', { name: /Charmander/ })
  expect(cardButton).toHaveAccessibleName(new RegExp(card.name))
  expect(cardButton).toHaveAccessibleName(/等级 1/)
  expect(cardButton).toHaveAccessibleName(/0 分/)
  expect(cardButton).toHaveAccessibleName(/奖励 电/)
  expect(cardButton).toHaveAccessibleName(/火 2/)
  expect(cardButton).toHaveAccessibleName(/超能 1/)
})

test('points value stays in the accessible label for a point-bearing card', () => {
  renderCard('tier-3-001')

  const cardButton = screen.getByRole('button', { name: /Larvitar/ })
  expect(cardButton).toHaveAccessibleName(/4 分/)
  expect(cardButton).toHaveAccessibleName(/奖励 电/)
  expect(cardButton).toHaveAccessibleName(/超能 7/)
})
