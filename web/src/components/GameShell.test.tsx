import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'
import App from '../App'
import { CARDS } from '../data/cards'
import { NOBLES } from '../data/nobles'
import { createInitialGame } from '../domain/setup'
import { zeroTokenInventory } from '../domain/inventory'
import type { GameState } from '../domain/model'
import CardView from './CardView'

function cardFor(state: GameState, tier: 1 | 2 | 3) {
  const cardId = state.market[tier][0]
  const card = CARDS.find((candidate) => candidate.id === cardId)
  if (!card) throw new Error(`Missing card ${cardId}`)
  return card
}

async function takeThreeTokens(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /火徽章，持有 0，银行 7/ }))
  await user.click(screen.getByRole('button', { name: /水徽章，持有 0，银行 7/ }))
  await user.click(screen.getByRole('button', { name: /草徽章，持有 0，银行 7/ }))
  await user.click(screen.getByRole('button', { name: '执行拿取' }))
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

function createShuffledFinishedState(): GameState {
  const state = structuredClone(createInitialGame(123))
  state.phase = 'finished'
  state.players = [state.players[2], state.players[0], state.players[3], state.players[1]]
  state.players[0] = {
    ...state.players[0],
    points: 5,
    purchasedCards: Array.from({ length: 4 }, () => 'tier-1-001'),
  }
  state.players[1] = {
    ...state.players[1],
    points: 10,
    purchasedCards: ['tier-1-001', 'tier-1-002'],
  }
  state.players[2] = {
    ...state.players[2],
    points: 10,
    purchasedCards: ['tier-1-003'],
  }
  state.players[3] = { ...state.players[3], points: 5, purchasedCards: [] }
  state.currentPlayerIndex = 0
  state.winnerIds = ['ai-3']
  return state
}

function createAiTurnState(): GameState {
  const state = structuredClone(createInitialGame(123))
  state.currentPlayerIndex = 1
  return state
}

function createIllegalTokenState(): GameState {
  const state = structuredClone(createInitialGame(123))
  state.tokenBank = { ...state.tokenBank, fire: 0, water: 0, grass: 0 }
  return state
}

function createReserveLimitState(): GameState {
  const state = structuredClone(createInitialGame(123))
  state.players[0] = {
    ...state.players[0],
    reservedCards: ['tier-2-001', 'tier-2-002', 'tier-2-003'],
  }
  return state
}

function createReservedReadyState() {
  const state = structuredClone(createInitialGame(123))
  const card = cardFor(state, 1)
  const tokens = zeroTokenInventory()

  for (const color of Object.keys(card.cost) as Array<keyof typeof card.cost>) {
    tokens[color] = card.cost[color]
  }

  state.market[card.tier] = state.market[card.tier].filter((cardId) => cardId !== card.id)
  state.players[0] = { ...state.players[0], reservedCards: [card.id], tokens }
  return { state, card }
}

function createLoggedState(): GameState {
  const state = structuredClone(createInitialGame(123))
  state.eventLog = [{ type: 'seed', playerId: 'human', message: 'existing event' }]
  return state
}

test('exposes the title and the three named table regions', () => {
  render(<App seed={123} />)

  expect(screen.getByRole('heading', { name: '宝可梦宝石联赛' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '野外市场' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '训练家进度' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '你的行动' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '你的队伍' })).toBeInTheDocument()
  expect(screen.getByRole('region', { name: '对局记录' }).querySelector('.event-log__list')).toHaveAttribute(
    'aria-live',
    'polite',
  )
})

test('renders market tiers in approved A order from tier 3 down to tier 1', () => {
  render(<App seed={123} />)

  const market = screen.getByRole('region', { name: '野外市场' })
  const tierHeadings = within(market).getAllByRole('heading', { level: 3 })

  expect(tierHeadings.map((heading) => heading.textContent)).toEqual(['等级 3', '等级 2', '等级 1'])
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

test('includes card name, tier, points, bonus, and every non-zero cost in its accessible label', () => {
  const card = CARDS.find((candidate) => candidate.id === 'tier-1-002')
  if (!card) throw new Error('Missing card label fixture')

  render(<CardView card={card} selected={false} selectCard={() => undefined} />)

  const cardButton = screen.getByRole('button', { name: /Charmander/ })
  expect(cardButton).toHaveAccessibleName(/Charmander/)
  expect(cardButton).toHaveAccessibleName(/等级 1/)
  expect(cardButton).toHaveAccessibleName(/0 分/)
  expect(cardButton).toHaveAccessibleName(/奖励 电/)
  expect(cardButton).toHaveAccessibleName(/火 2/)
  expect(cardButton).toHaveAccessibleName(/超能 1/)
})

test('dispatches a legal three-different-token action through the session', async () => {
  const user = userEvent.setup()
  render(<App seed={123} />)

  const fireStack = screen.getByRole('button', { name: /火徽章，持有 0，银行 7/ })
  expect(fireStack).toBeEnabled()

  await takeThreeTokens(user)

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
  expect(screen.getByText(/从野外市场选择一张卡牌/)).toBeInTheDocument()
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
  expect(screen.getByText(/从野外市场选择一张卡牌/)).toBeInTheDocument()
})

test('selects and purchases a reserved card through the real session', async () => {
  const user = userEvent.setup()
  const { state, card } = createReservedReadyState()

  render(<App initialState={state} />)

  const team = screen.getByRole('region', { name: '你的队伍' })
  const reservedButton = within(team).getByRole('button', { name: new RegExp(`${card.name}.*预留`) })
  expect(reservedButton).toHaveAttribute('aria-pressed', 'false')
  expect(reservedButton.querySelector('div, h1, h2, h3, h4, h5, h6')).toBeNull()
  expect(reservedButton).toHaveAccessibleName(/奖励 超能/)
  expect(reservedButton).toHaveAccessibleName(/火 1/)
  expect(reservedButton).toHaveAccessibleName(/电 2/)

  await user.click(reservedButton)

  expect(reservedButton).toHaveAttribute('aria-pressed', 'true')
  const buyButton = screen.getByRole('button', { name: new RegExp(`购买.*${card.name}`) })
  expect(buyButton).toBeEnabled()
  await user.click(buyButton)

  expect(within(screen.getByRole('region', { name: '训练家进度' })).getByText(/已购卡.*1/)).toBeInTheDocument()
  expect(screen.getByText(/从野外市场选择一张卡牌/)).toBeInTheDocument()
  expect(within(team).queryByRole('button', { name: new RegExp(`${card.name}.*预留`) })).not.toBeInTheDocument()
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

test('falls back to the image key when a card image cannot load', () => {
  const card = { ...CARDS[0], imageKey: 'missing-pokemon-art' }
  const { container } = render(<CardView card={card} selected={false} selectCard={() => undefined} />)
  const image = container.querySelector('img')

  if (!image) throw new Error('Expected a card image')
  fireEvent.error(image)

  expect(screen.getByText('missing-pokemon-art')).toBeInTheDocument()
})

test('shows the AI-thinking indicator and locks human controls during an AI turn', () => {
  render(<App initialState={createAiTurnState()} />)

  expect(within(screen.getByRole('region', { name: '你的行动' })).getByText(/电脑行动中 · 小智/)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /火徽章，持有 0，银行 7/ })).toBeDisabled()
})

test('does not dispatch an illegal token action when the bank lacks one requested color', async () => {
  const user = userEvent.setup()
  render(<App initialState={createIllegalTokenState()} />)

  const fireStack = screen.getByRole('button', { name: /火徽章，持有 0，银行 0/ })
  expect(fireStack).toBeDisabled()
  await user.click(fireStack)

  expect(within(screen.getByRole('region', { name: '对局记录' })).getByText(/第一枚宝石/)).toBeInTheDocument()
})

test('does not dispatch an illegal reserve action after reaching the reserve limit', async () => {
  const user = userEvent.setup()
  const state = createReserveLimitState()
  const card = cardFor(state, 1)

  render(<App initialState={state} />)
  await user.click(screen.getByRole('button', { name: new RegExp(card.name) }))

  const reserveButton = screen.getByRole('button', { name: new RegExp(`预留.*${card.name}`) })
  expect(reserveButton).toBeDisabled()
  await user.click(reserveButton)

  expect(within(screen.getByRole('region', { name: '对局记录' })).getByText(/第一枚宝石/)).toBeInTheDocument()
})

test('keeps an existing event node stable when a newer event is appended', async () => {
  const user = userEvent.setup()
  render(<App initialState={createLoggedState()} />)

  const eventLog = screen.getByRole('region', { name: '对局记录' })
  const existingEvent = within(eventLog).getByText('existing event')
  await takeThreeTokens(user)

  expect(within(eventLog).getByText('existing event')).toBe(existingEvent)
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

test('moves focus into the rules modal, wraps Tab, and restores the opener on Escape', async () => {
  const user = userEvent.setup()
  render(<App seed={123} />)

  const opener = screen.getByRole('button', { name: '规则' })
  opener.focus()
  await user.click(opener)
  const dialog = screen.getByRole('dialog', { name: '对局规则' })
  const closeButton = within(dialog).getByRole('button', { name: '关闭规则' })
  const lastButton = within(dialog).getByRole('button', { name: '返回牌桌' })

  expect(closeButton).toHaveFocus()
  await user.tab({ shift: true })
  expect(lastButton).toHaveFocus()
  await user.tab()
  expect(closeButton).toHaveFocus()
  await user.keyboard('{Escape}')
  expect(opener).toHaveFocus()
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
  expect(screen.getByRole('button', { name: /火徽章，持有 0，银行 7/ })).toBeDisabled()

  await user.click(choices[0])

  const eventLog = screen.getByRole('region', { name: '对局记录' })
  expect(within(eventLog).getByText(new RegExp(`玩家 claimed ${firstNoble.name}`, 'i'))).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: '你的行动' })).toHaveFocus()
})

test('keeps the pending noble choice centered in a fixed viewport backdrop and traps focus', async () => {
  const user = userEvent.setup()
  render(<App initialState={createPendingNobleState()} />)

  const dialog = screen.getByRole('dialog', { name: '选择贵族' })
  const options = within(dialog).getAllByRole('button', { name: /选择/ })
  const backdrop = dialog.parentElement

  expect(backdrop).toHaveClass('choice-backdrop')
  expect(options[0]).toHaveFocus()
  await user.tab({ shift: true })
  expect(options[options.length - 1]).toHaveFocus()
  await user.tab()
  expect(options[0]).toHaveFocus()
})

test('closes the pending noble modal with Escape while keeping the required choice panel available', async () => {
  const user = userEvent.setup()
  render(<App initialState={createPendingNobleState()} />)

  await user.keyboard('{Escape}')

  expect(screen.queryByRole('dialog', { name: '选择贵族' })).not.toBeInTheDocument()
  const inlineChoices = screen.getAllByRole('button', { name: /选择/ })
  expect(inlineChoices).toHaveLength(2)
  expect(inlineChoices[0]).toHaveFocus()
})

test('confirms before restarting an active game and restarts when accepted', async () => {
  const user = userEvent.setup()
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<App seed={123} />)

  await takeThreeTokens(user)

  await user.click(screen.getByRole('button', { name: '重新开始' }))

  expect(confirmSpy).toHaveBeenCalledTimes(1)
  expect(within(screen.getByRole('region', { name: '对局记录' })).getByText(/第一枚宝石/)).toBeInTheDocument()
  confirmSpy.mockRestore()
})

test('does not restart an active game when the confirmation is declined', async () => {
  const user = userEvent.setup()
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
  render(<App seed={123} />)

  await takeThreeTokens(user)

  await user.click(screen.getByRole('button', { name: '重新开始' }))

  expect(confirmSpy).toHaveBeenCalledTimes(1)
  expect(within(screen.getByRole('region', { name: '对局记录' })).getByText(/took one token of each/i)).toBeInTheDocument()
  confirmSpy.mockRestore()
})

test('closes the rules modal and restarts after confirming an active game restart', async () => {
  const user = userEvent.setup()
  const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(<App seed={123} />)

  await takeThreeTokens(user)
  await user.click(screen.getByRole('button', { name: '规则' }))
  expect(screen.getByRole('dialog', { name: '对局规则' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: '重新开始' }))

  expect(confirmSpy).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('dialog', { name: '对局规则' })).not.toBeInTheDocument()
  expect(within(screen.getByRole('region', { name: '对局记录' })).getByText(/第一枚宝石/)).toBeInTheDocument()
  confirmSpy.mockRestore()
})

test('restarts without confirmation when the game has not begun', async () => {
  const user = userEvent.setup()
  const confirmSpy = vi.spyOn(window, 'confirm')
  render(<App seed={123} />)

  await user.click(screen.getByRole('button', { name: '重新开始' }))

  expect(confirmSpy).not.toHaveBeenCalled()
  confirmSpy.mockRestore()
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
  expect(screen.getByRole('button', { name: '重新开始' })).toHaveFocus()
})

test('focuses the victory action and closes it with Escape by restarting', async () => {
  const user = userEvent.setup()
  render(<App initialState={createFinishedState()} />)

  const dialog = screen.getByRole('dialog', { name: '联赛结算' })
  const restartButton = within(dialog).getByRole('button', { name: '再开一局' })
  expect(restartButton).toHaveFocus()

  await user.keyboard('{Escape}')

  expect(screen.queryByRole('dialog', { name: '联赛结算' })).not.toBeInTheDocument()
})

test('never exposes concurrent Rules and Victory modals', async () => {
  const user = userEvent.setup()
  render(<App initialState={createFinishedState()} />)

  expect(document.querySelectorAll('[aria-modal="true"]')).toHaveLength(1)
  await user.click(screen.getByRole('button', { name: '规则' }))
  expect(document.querySelectorAll('[aria-modal="true"]')).toHaveLength(1)

  const victory = screen.getByRole('dialog', { name: '联赛结算' })
  await user.click(within(victory).getByRole('button', { name: '再开一局' }))
  expect(document.querySelectorAll('[aria-modal="true"]')).toHaveLength(0)
})

test('renders finished standings sorted by points, then fewer purchased cards', () => {
  render(<App initialState={createShuffledFinishedState()} />)

  const overlay = screen.getByRole('dialog', { name: '联赛结算' })
  const rows = within(overlay).getAllByRole('row').slice(1)
  const names = rows.map((row) => within(row).getAllByRole('cell')[0].textContent?.replace('冠军', '').trim())

  expect(names).toEqual(['小刚', '玩家', '小智', '小霞'])
})

test('shows the human purchased Pokemon cards and all five permanent bonus counts', () => {
  const state = structuredClone(createInitialGame(123))
  state.players[0] = {
    ...state.players[0],
    purchasedCards: ['tier-1-001'],
    bonuses: { fire: 1, water: 2, grass: 3, electric: 4, psychic: 5 },
  }

  render(<App initialState={state} />)

  const team = screen.getByRole('region', { name: '你的队伍' })
  expect(within(team).getByText('Bulbasaur')).toBeInTheDocument()
  expect(within(team).getByText(/火.*1/)).toBeInTheDocument()
  expect(within(team).getByText(/水.*2/)).toBeInTheDocument()
  expect(within(team).getByText(/草.*3/)).toBeInTheDocument()
  expect(within(team).getByText(/电.*4/)).toBeInTheDocument()
  expect(within(team).getByText(/超能.*5/)).toBeInTheDocument()
})
