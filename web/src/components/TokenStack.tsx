import type { CSSProperties } from 'react'
import type { StandardTokenColor } from '../domain/model'

export const COLOR_LABELS: Record<StandardTokenColor, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  psychic: '超能',
}

export const RAINBOW_LABEL = '万能'

export function tokenStackHeight(count: number): number {
  return 10 + clampChipCount(count) * 5
}

export const MAX_VISIBLE_CHIPS = 8

export function clampChipCount(count: number): number {
  return Math.min(Math.max(count, 0), MAX_VISIBLE_CHIPS)
}

export function chipPosition(index: number): { bottom: number; left: number } {
  return { bottom: index * 5, left: (index % 2) * 4 }
}

function stackStyle(count: number): CSSProperties {
  return { '--stack-height': `${tokenStackHeight(count)}px` } as CSSProperties
}

interface StackBodyProps {
  color: StandardTokenColor | 'rainbow'
  count: number
  bank: number
}

function StackBody({ color, count, bank }: StackBodyProps) {
  const label = color === 'rainbow' ? RAINBOW_LABEL : COLOR_LABELS[color]
  const chipCount = clampChipCount(count)

  return (
    <>
      <span className="token-stack__chips" aria-hidden="true">
        {Array.from({ length: chipCount }, (_, index) => (
          <span key={index} className="token-stack__chip" style={chipPosition(index)} />
        ))}
      </span>
      <span className="token-stack__label">{label}</span>
      <strong className="token-stack__held">{count}</strong>
      <span className="token-stack__bank">银行 {bank}</span>
    </>
  )
}

export interface HeldTokenStackProps {
  color: StandardTokenColor | 'rainbow'
  held: number
  bank: number
}

export function HeldTokenStack({ color, held, bank }: HeldTokenStackProps) {
  const label = color === 'rainbow' ? RAINBOW_LABEL : COLOR_LABELS[color]

  return (
    <div
      className={`token-stack token-stack--held token-stack--${color}`}
      style={stackStyle(held)}
      role="img"
      aria-label={`${label}徽章，持有 ${held}，银行 ${bank}`}
    >
      <StackBody color={color} count={held} bank={bank} />
    </div>
  )
}

export interface BankTokenStackProps {
  color: StandardTokenColor | 'rainbow'
  held: number
  bank: number
  selected: boolean
  disabled: boolean
  onPick: () => void
}

export function BankTokenStack({
  color,
  held,
  bank,
  selected,
  disabled,
  onPick,
}: BankTokenStackProps) {
  const label = color === 'rainbow' ? RAINBOW_LABEL : COLOR_LABELS[color]

  return (
    <button
      type="button"
      className={`token-stack token-stack--bank token-stack--${color}${selected ? ' is-selected' : ''}`}
      style={stackStyle(bank)}
      aria-pressed={selected}
      aria-label={`${label} · 持有 ${held} · 银行 ${bank}`}
      disabled={disabled}
      onClick={onPick}
    >
      <StackBody color={color} count={bank} bank={bank} />
    </button>
  )
}
