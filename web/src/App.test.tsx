import { render, screen } from '@testing-library/react'
import App from './App'

test('shows the game title', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /宝可梦宝石联赛/i })).toBeInTheDocument()
})
