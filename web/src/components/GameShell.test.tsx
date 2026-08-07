import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import App from '../App'
import { CARDS } from '../data/cards'
import { NOBLES } from '../data/nobles'
import { createInitialGame } from '../domain/setup'
import { zeroTokenInventory } from '../domain/inventory'
import type { GameState } from '../domain/model'

function cardFor(state: GameState, tier: 1 | 2 | 3) {
  const cardId = state.market[tier][0]
  const card = CARDS.find((candidate) => candidate.id === cardId)
  if (!card) throw new Error(`Missing card ${cardId}`)
  return card
}

function createPendingNobleState(): GameState {
  const state = structuredClone(createInitialGame(123))
  state.players[0] = {
    ...state.players[0],
    bonuses: {
      fire: 4,
      water: 4,
      grass: 4,
      electric: 4,
      psychic: 4,
    },
  }
  state.pendingNobleIds = state.availableNobles.slice(0, 2)
  state.pendingNoblePlayerId = 'human'
  return state
}

function createReadyToBuyState(): GameState {
  const state = structuredClone(createInitialGame(123))
  const card = cardFor(state, 1)
  const tokens = zeroTokenInventory()

  for (const color of Object.keys(card.cost) as Array<keyof typeof card.cost>) {
    tokens[color] = card.cost[color]
  }

  state.players[0] = { ...state.players[0], tokens }
  return state
}

function createFinishedState(): GameState {
  const state = structuredClone(createInitialGame(123))
  state.phase = 'finished'
  state.currentPlayerIndex = 1
  state.players[0] = { ...state.players[0], points: 15, purchasedCards: ['tier-1-001'] }
  state.players[1] = { ...state.players[1], points: 6, purchasedCards: [] }
  state.winnerIds = ['human']
  state.eventLog = [
    { type: 'buy-card', playerId: 'human', message: '玩家 bought Bulbasaur.' },
  ]
  return state
}

test('exposes the title and the three named table regions', () => {
  render(<App seed={123} />)

  expect(screen.getByRole('heading', { name: '宝可梦宝石联赛' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '野外市场' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '训练家进度' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '你的行动' })).toBeInTheDocument()
})

test('selecting a market card changes its pressed state and the selected information', async () => {
  const user = userEvent.setup()
  const state = createInitialGame(123)
  const card = cardFor(state, 1)

  render(<App seed={123} />)

  const cardButton = screen.getByRole('button', { name: new RegExp(card.name) })
  expect(cardButton).toHaveAttribute('aria-pressed', 'false')

  await user.click(cardButton)

  expect(cardButton).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText(new RegExp(`已选择.*${card.name}`))).toBeInTheDocument()
})

test('dispatches a legal three-different-token action through the session', async () => {
  const user = userEvent.setup()
  render(<App seed={123} />)

  const actionButton = screen.getByRole('button', { name: /拿取.*火.*水.*草/ })
  expect(actionButton).toBeEnabled()

  await user.click(actionButton)

  const eventLog = screen.getByRole('region', { name: '对局记录' })
  expect(within(eventLog).getByText(/玩家 took one token of each: fire, water, grass/i)).toBeInTheDocument()
  expect(screen.getByText(/代币总数.*3/)).toBeInTheDocument()
})

test('dispatches a legal reserve action for the selected market card', async () => {
  const user = userEvent.setup()
  const state = createInitialGame(123)
  const card = cardFor(state, 1)

  render(<App seed={123} />)
  await user.click(screen.getByRole('button', { name: new RegExp(card.name) }))

  const reserveButton = screen.getByRole('button', { name: new RegExp(`预留.*${card.name}`) })
  expect(reserveButton).toBeEnabled()
  await user.click(reserveButton)

  const eventLog = screen.getByRole('region', { name: '对局记录' })
  expect(within(eventLog).getByText(new RegExp(`玩家 reserved ${card.name}`, 'i'))).toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: '训练家进度' })).getByText(/预留卡.*1/)).toBeInTheDocument()
})

test('dispatches a legal buy action and updates the purchased-card count', async () => {
  const user = userEvent.setup()
  const state = createReadyToBuyState()
  const card = cardFor(state, 1)

  render(<App initialState={state} />)
  await user.click(screen.getByRole('button', { name: new RegExp(card.name) }))

  const buyButton = screen.getByRole('button', { name: new RegExp(`购买.*${card.name}`) })
  expect(buyButton).toBeEnabled()
  await user.click(buyButton)

  const eventLog = screen.getByRole('region', { name: '对局记录' })
  expect(within(eventLog).getByText(new RegExp(`玩家 bought ${card.name}`, 'i'))).toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: '训练家进度' })).getByText(/已购卡.*1/)).toBeInTheDocument()
})

test('does not dispatch an illegal buy action and keeps it disabled', async () => {
  const user = userEvent.setup()
  const state = createInitialGame(123)
  const card = cardFor(state, 1)

  render(<App seed={123} />)
  await user.click(screen.getByRole('button', { name: new RegExp(card.name) }))

  const buyButton = screen.getByRole('button', { name: new RegExp(`购买.*${card.name}`) })
  expect(buyButton).toBeDisabled()
  await user.click(buyButton)

  expect(screen.queryByText(new RegExp(`玩家 bought ${card.name}`, 'i'))).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('opens and closes the rules dialog with Escape', async () => {
  const user = userEvent.setup()
  render(<App seed={123} />)

  await user.click(screen.getByRole('button', { name: '规则' }))
  const dialog = screen.getByRole('dialog', { name: '对局规则' })
  expect(dialog).toHaveAttribute('aria-modal', 'true')
  expect(within(dialog).getByText(/回合结束时不能持有超过十枚代币/)).toBeInTheDocument()

  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog', { name: '对局规则' })).not.toBeInTheDocument()
})

test('renders pending noble choices and claims the selected noble', async () => {
  const user = userEvent.setup()
  const state = createPendingNobleState()
  const firstNoble = NOBLES.find((noble) => noble.id === state.pendingNobleIds[0])
  if (!firstNoble) throw new Error('Missing pending noble')

  render(<App initialState={state} />)

  const dialog = screen.getByRole('dialog', { name: '选择贵族' })
  const choices = within(dialog).getAllByRole('button', { name: /选择/ })
  expect(choices).toHaveLength(2)
  expect(screen.getByRole('button', { name: /拿取.*火.*水.*草/ })).toBeDisabled()

  await user.click(choices[0])

  const eventLog = screen.getByRole('region', { name: '对局记录' })
  expect(within(eventLog).getByText(new RegExp(`玩家 claimed ${firstNoble.name}`, 'i'))).toBeInTheDocument()
})

test('renders the finished victory overlay and restarts the session', async () => {
  const user = userEvent.setup()
  render(<App initialState={createFinishedState()} />)

  const overlay = screen.getByRole('dialog', { name: '联赛结算' })
  expect(within(overlay).getByRole('cell', { name: /玩家/ })).toBeInTheDocument()
  expect(within(overlay).getByText(/积分优先/)).toBeInTheDocument()
  expect(within(overlay).getByRole('button', { name: '再开一局' })).toBeInTheDocument()

  await user.click(within(overlay).getByRole('button', { name: '再开一局' }))

  expect(screen.queryByRole('dialog', { name: '联赛结算' })).not.toBeInTheDocument()
})
