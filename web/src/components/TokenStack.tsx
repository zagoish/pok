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
  return 10 + Math.min(Math.max(count, 0), 8) * 5
}

const MAX_VISIBLE_CHIPS = 8

export interface TokenStackProps {
  color: StandardTokenColor | 'rainbow'
  held: number
  bank: number
  selected: boolean
  disabled?: boolean
  onPick: () => void
}

export default function TokenStack({ color, held, bank, selected, disabled, onPick }: TokenStackProps) {
  const label = color === 'rainbow' ? RAINBOW_LABEL : COLOR_LABELS[color]
  const height = tokenStackHeight(held)
  const chipCount = Math.min(Math.max(held, 0), MAX_VISIBLE_CHIPS)
  const style = { '--stack-height': `${height}px` } as CSSProperties

  return (
    <button
      type="button"
      className={`token-stack token-stack--${color}${selected ? ' is-selected' : ''}`}
      style={style}
      aria-pressed={selected}
      aria-label={`${label}徽章，持有 ${held}，银行 ${bank}`}
      disabled={disabled}
      onClick={onPick}
    >
      <span className="token-stack__chips" aria-hidden="true">
        {Array.from({ length: chipCount }, (_, index) => (
          <span
            key={index}
            className="token-stack__chip"
            style={{ bottom: `${index * 5}px`, left: `${(index % 2) * 4}px` }}
          />
        ))}
      </span>
      <span className="token-stack__label">{label}</span>
      <strong className="token-stack__held">{held}</strong>
      <span className="token-stack__bank">银行 {bank}</span>
    </button>
  )
}
