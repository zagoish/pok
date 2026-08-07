import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { applyAction } from '../domain/action-apply'
import { createInitialGame } from '../domain/setup'
import type { Action, GameState } from '../domain/model'
import ActionPanel from './ActionPanel'

function renderPanel(state: GameState, dispatch: (action: Action) => void = () => undefined) {
  return render(<ActionPanel state={state} selectedCardId={null} lastError={null} dispatch={dispatch} />)
}

function renderHarness(initialState = createInitialGame(123)) {
  function Harness() {
    const [state, setState] = useState(initialState)
    const dispatch = (action: Action) => {
      const result = applyAction(state, action)
      if (result.ok) setState(result.value)
    }
    return <ActionPanel state={state} selectedCardId={null} lastError={null} dispatch={dispatch} />
  }
  return render(<Harness />)
}

function stackName(color: string, held: number, bank: number): string {
  const labels: Record<string, string> = {
    fire: '火',
    water: '水',
    grass: '草',
    electric: '电',
    psychic: '超能',
    rainbow: '万能',
  }
  return `${labels[color]}徽章，持有 ${held}，银行 ${bank}`
}

function bankLabel(color: string, held: number, bank: number): string {
  const labels: Record<string, string> = {
    fire: '火',
    water: '水',
    grass: '草',
    electric: '电',
    psychic: '超能',
    rainbow: '万能',
  }
  return `${labels[color]} · 持有 ${held} · 银行 ${bank}`
}

async function pickStacks(user: ReturnType<typeof userEvent.setup>, stacks: Array<[string, number, number]>) {
  for (const [color, held, bank] of stacks) {
    await user.click(screen.getByRole('button', { name: stackName(color, held, bank) }))
  }
}

test('renders six token stacks with player counts and bank counts', () => {
  const state = createInitialGame(123)
  state.players[0] = {
    ...state.players[0],
    tokens: { ...state.players[0].tokens, fire: 2, water: 1 },
  }
  state.tokenBank = { ...state.tokenBank, fire: 4 }

  renderPanel(state)

  const fire = screen.getByRole('button', { name: stackName('fire', 2, 4) })
  const water = screen.getByRole('button', { name: stackName('water', 1, 7) })
  const grass = screen.getByRole('button', { name: stackName('grass', 0, 7) })
  const electric = screen.getByRole('button', { name: stackName('electric', 0, 7) })
  const psychic = screen.getByRole('button', { name: stackName('psychic', 0, 7) })
  const rainbow = screen.getByRole('button', { name: stackName('rainbow', 0, 5) })

  for (const stack of [fire, water, grass, electric, psychic, rainbow]) {
    expect(stack).toBeInTheDocument()
    expect(stack).toHaveAttribute('aria-pressed', 'false')
  }

  expect(fire).toHaveStyle({ '--stack-height': '20px' })
  expect(water).toHaveStyle({ '--stack-height': '15px' })
  expect(grass).toHaveStyle({ '--stack-height': '10px' })
})

test('clicking three different colors forms and dispatches a take-three-different action', async () => {
  const user = userEvent.setup()
  const dispatch = vi.fn()
  renderPanel(createInitialGame(123), dispatch)

  await pickStacks(user, [
    ['fire', 0, 7],
    ['water', 0, 7],
    ['grass', 0, 7],
  ])

  expect(screen.getByText(/拿取三枚不同徽章/)).toBeInTheDocument()
  const confirm = screen.getByRole('button', { name: '执行拿取' })
  expect(confirm).toBeEnabled()

  await user.click(confirm)

  expect(dispatch).toHaveBeenCalledTimes(1)
  expect(dispatch).toHaveBeenCalledWith({
    type: 'take-three-different',
    playerId: 'human',
    colors: ['fire', 'water', 'grass'],
  })
})

test('clicking the same color twice with bank >= 4 forms and dispatches a take-two-same action', async () => {
  const user = userEvent.setup()
  const dispatch = vi.fn()
  renderPanel(createInitialGame(123), dispatch)

  await user.click(screen.getByRole('button', { name: stackName('fire', 0, 7) }))
  await user.click(screen.getByRole('button', { name: stackName('fire', 0, 7) }))

  expect(screen.getByText(/拿取两枚火徽章/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '执行拿取' }))

  expect(dispatch).toHaveBeenCalledTimes(1)
  expect(dispatch).toHaveBeenCalledWith({ type: 'take-two-same', playerId: 'human', color: 'fire' })
})

test('rejects a third click on the same color without changing the selection', async () => {
  const user = userEvent.setup()
  const dispatch = vi.fn()
  renderPanel(createInitialGame(123), dispatch)

  await user.click(screen.getByRole('button', { name: stackName('fire', 0, 7) }))
  await user.click(screen.getByRole('button', { name: stackName('fire', 0, 7) }))
  await user.click(screen.getByRole('button', { name: stackName('fire', 0, 7) }))

  expect(screen.getByRole('alert')).toHaveTextContent('不能拿取三个相同徽章')
  expect(screen.getAllByRole('button', { name: /移除火徽章/ })).toHaveLength(2)
  expect(screen.getByRole('button', { name: '执行拿取' })).toBeInTheDocument()
  expect(dispatch).not.toHaveBeenCalled()
})

test('rejects a second same-color click when the bank has fewer than four tokens', async () => {
  const user = userEvent.setup()
  const state = createInitialGame(123)
  state.tokenBank = { ...state.tokenBank, fire: 3 }
  const dispatch = vi.fn()
  renderPanel(state, dispatch)

  await user.click(screen.getByRole('button', { name: stackName('fire', 0, 3) }))
  await user.click(screen.getByRole('button', { name: stackName('fire', 0, 3) }))

  expect(screen.getByRole('alert')).toHaveTextContent('银行该色不足四枚')
  expect(screen.getAllByRole('button', { name: /移除火徽章/ })).toHaveLength(1)
  expect(screen.queryByRole('button', { name: '执行拿取' })).not.toBeInTheDocument()
  expect(dispatch).not.toHaveBeenCalled()
})

test('rejects rainbow picks with the rainbow hint', async () => {
  const user = userEvent.setup()
  const dispatch = vi.fn()
  renderPanel(createInitialGame(123), dispatch)

  await user.click(screen.getByRole('button', { name: stackName('rainbow', 0, 5) }))

  expect(screen.getByRole('alert')).toHaveTextContent('彩虹能量只能通过预留或购买获得')
  expect(screen.queryAllByRole('button', { name: /移除/ })).toHaveLength(0)
  expect(screen.queryByRole('button', { name: '执行拿取' })).not.toBeInTheDocument()
  expect(dispatch).not.toHaveBeenCalled()
})

test('confirm dispatches exactly once and clears the selection and hints', async () => {
  const user = userEvent.setup()
  const dispatch = vi.fn()
  renderPanel(createInitialGame(123), dispatch)

  await pickStacks(user, [
    ['fire', 0, 7],
    ['water', 0, 7],
    ['grass', 0, 7],
  ])
  await user.click(screen.getByRole('button', { name: '执行拿取' }))

  expect(dispatch).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: '执行拿取' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /移除/ })).not.toBeInTheDocument()
  expect(screen.queryByText(/已选择：拿取三枚不同徽章/)).not.toBeInTheDocument()
})

test('removes a picked chip from the selection when clicked', async () => {
  const user = userEvent.setup()
  renderPanel(createInitialGame(123))

  await pickStacks(user, [
    ['fire', 0, 7],
    ['water', 0, 7],
  ])
  expect(screen.getByRole('button', { name: /移除火徽章/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '执行拿取' })).not.toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /移除水徽章/ }))

  expect(screen.queryByRole('button', { name: /移除水徽章/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /移除火徽章/ })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '执行拿取' })).not.toBeInTheDocument()
})

test('updates counts after a successful dispatch and scales the stack height', async () => {
  const user = userEvent.setup()
  renderHarness()

  await pickStacks(user, [
    ['fire', 0, 7],
    ['water', 0, 7],
    ['grass', 0, 7],
  ])
  await user.click(screen.getByRole('button', { name: '执行拿取' }))

  const fire = screen.getByRole('button', { name: stackName('fire', 1, 6) })
  const water = screen.getByRole('button', { name: stackName('water', 1, 6) })
  expect(fire).toBeInTheDocument()
  expect(water).toBeInTheDocument()
  expect(fire).toHaveStyle({ '--stack-height': '15px' })
  expect(screen.getByRole('button', { name: stackName('grass', 1, 6) })).toHaveStyle({ '--stack-height': '15px' })
  expect(screen.queryByRole('button', { name: '执行拿取' })).not.toBeInTheDocument()
})

test('locks the stacks and clears any selection when the human turn is not active', () => {
  const state = createInitialGame(123)
  state.currentPlayerIndex = 1

  renderPanel(state)

  expect(screen.getByRole('button', { name: stackName('fire', 0, 7) })).toBeDisabled()
  expect(screen.getByRole('button', { name: stackName('rainbow', 0, 5) })).toBeDisabled()
  expect(screen.queryByRole('button', { name: '执行拿取' })).not.toBeInTheDocument()
})

test('disables a stack whose bank color is empty', () => {
  const state = createInitialGame(123)
  state.tokenBank = { ...state.tokenBank, fire: 0 }

  renderPanel(state)

  expect(screen.getByRole('button', { name: stackName('fire', 0, 0) })).toBeDisabled()
  expect(screen.getByRole('button', { name: stackName('water', 0, 7) })).toBeEnabled()
})

test('renders a bank group with all six colors and their bank counts', () => {
  const state = createInitialGame(123)
  state.players[0] = {
    ...state.players[0],
    tokens: { ...state.players[0].tokens, fire: 2, water: 1 },
  }
  state.tokenBank = { ...state.tokenBank, fire: 4, water: 0 }

  renderPanel(state)

  const bank = screen.getByRole('group', { name: /银行/ })
  expect(within(bank).getByRole('img', { name: bankLabel('fire', 2, 4) })).toBeInTheDocument()
  expect(within(bank).getByRole('img', { name: bankLabel('water', 1, 0) })).toBeInTheDocument()
  expect(within(bank).getByRole('img', { name: bankLabel('grass', 0, 7) })).toBeInTheDocument()
  expect(within(bank).getByRole('img', { name: bankLabel('electric', 0, 7) })).toBeInTheDocument()
  expect(within(bank).getByRole('img', { name: bankLabel('psychic', 0, 7) })).toBeInTheDocument()
  expect(within(bank).getByRole('img', { name: bankLabel('rainbow', 0, 5) })).toBeInTheDocument()
  expect(within(bank).queryAllByRole('button')).toHaveLength(0)
})

test('bank stacks are display-only: clicking them changes nothing and shows no hint', async () => {
  const user = userEvent.setup()
  const dispatch = vi.fn()
  renderPanel(createInitialGame(123), dispatch)

  const bank = screen.getByRole('group', { name: /银行/ })
  await user.click(within(bank).getByRole('img', { name: bankLabel('fire', 0, 7) }))
  await user.click(within(bank).getByRole('img', { name: bankLabel('water', 0, 7) }))
  await user.click(within(bank).getByRole('img', { name: bankLabel('fire', 0, 7) }))

  expect(screen.queryByRole('button', { name: /移除/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '执行拿取' })).not.toBeInTheDocument()
  expect(screen.queryByText(/已选择/)).not.toBeInTheDocument()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(dispatch).not.toHaveBeenCalled()
})

test('held stacks still form a selection after interacting with the bank group', async () => {
  const user = userEvent.setup()
  renderPanel(createInitialGame(123))

  const bank = screen.getByRole('group', { name: /银行/ })
  await user.click(within(bank).getByRole('img', { name: bankLabel('fire', 0, 7) }))

  await user.click(screen.getByRole('button', { name: stackName('fire', 0, 7) }))
  await user.click(screen.getByRole('button', { name: stackName('water', 0, 7) }))

  expect(screen.getByRole('button', { name: /移除火徽章/ })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /移除水徽章/ })).toBeInTheDocument()
})
