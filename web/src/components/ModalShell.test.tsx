import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import { useState } from 'react'
import ModalShell from './ModalShell'

function ModalHarness() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open modal
      </button>
      <ModalShell open={open} onClose={() => setOpen(false)} labelledBy="test-modal-heading" className="test-modal">
        <h2 id="test-modal-heading">Test modal</h2>
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </ModalShell>
    </>
  )
}

test('focuses the first control, traps Tab in both directions, closes with Escape, and restores focus', async () => {
  const user = userEvent.setup()
  render(<ModalHarness />)

  const opener = screen.getByRole('button', { name: 'Open modal' })
  opener.focus()
  await user.click(opener)

  const dialog = screen.getByRole('dialog', { name: 'Test modal' })
  const first = within(dialog).getByRole('button', { name: 'First action' })
  const last = within(dialog).getByRole('button', { name: 'Last action' })

  expect(first).toHaveFocus()
  await user.tab()
  expect(last).toHaveFocus()
  await user.tab()
  expect(first).toHaveFocus()
  await user.tab({ shift: true })
  expect(last).toHaveFocus()
  await user.keyboard('{Escape}')

  expect(screen.queryByRole('dialog', { name: 'Test modal' })).not.toBeInTheDocument()
  expect(opener).toHaveFocus()
})
