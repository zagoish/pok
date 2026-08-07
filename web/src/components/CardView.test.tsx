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

test('renders no pokeball icons for a zero-point card', () => {
  const { container } = renderCard('tier-1-002')
  expect(container.querySelectorAll('.card-view__points .pokeball')).toHaveLength(0)
  expect(container.querySelector('.card-view__points')).toHaveAttribute('data-count', '0')
})

test('renders one pokeball icon per point on a four-point card', () => {
  const { container, card } = renderCard('tier-3-001')
  expect(card.points).toBe(4)
  expect(container.querySelectorAll('.card-view__points .pokeball')).toHaveLength(4)
})

test('renders one pokeball icon per point on a five-point card', () => {
  const { container, card } = renderCard('tier-3-002')
  expect(card.points).toBe(5)
  expect(container.querySelectorAll('.card-view__points .pokeball')).toHaveLength(5)
})

test('renders the tier pokeball variant class for tiers 1, 2 and 3', () => {
  const t1 = renderCard('tier-1-002')
  expect(t1.container.querySelector('.pokeball--tier-1')).not.toBeNull()
  expect(t1.container.querySelector('button')).toHaveAttribute('data-tier', '1')

  const t2 = renderCard('tier-2-002')
  expect(t2.container.querySelector('.pokeball--tier-2')).not.toBeNull()
  expect(t2.container.querySelector('button')).toHaveAttribute('data-tier', '2')

  const t3 = renderCard('tier-3-001')
  expect(t3.container.querySelector('.pokeball--tier-3')).not.toBeNull()
  expect(t3.container.querySelector('button')).toHaveAttribute('data-tier', '3')
})

test('renders the bonus dot inside the top line, not in a bottom row', () => {
  const { container } = renderCard('tier-1-002')

  const bonus = container.querySelector('.card-view__topline .card-view__bonus')
  expect(bonus).not.toBeNull()
  expect(bonus?.querySelector('.token-dot.token-dot--electric')).not.toBeNull()
  expect(container.querySelectorAll('.card-view__bonus')).toHaveLength(1)
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
