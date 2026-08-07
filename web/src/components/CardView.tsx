import { useState } from 'react'
import { ASSET_PATHS } from '../data/assets'
import {
  STANDARD_TOKEN_COLORS,
  type Card,
  type CardId,
  type StandardTokenColor,
} from '../domain/model'

const COLOR_LABELS: Record<StandardTokenColor, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  psychic: '超能',
}

interface CardViewProps {
  card: Card
  selected: boolean
  selectCard: (cardId: CardId) => void
  disabled?: boolean
}

export default function CardView({ card, selected, selectCard, disabled = false }: CardViewProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const costs = STANDARD_TOKEN_COLORS.filter((color) => card.cost[color] > 0)

  return (
    <button
      type="button"
      className={`card-view card-view--tier-${card.tier}${selected ? ' is-selected' : ''}`}
      aria-label={`${card.name} 卡牌，等级 ${card.tier}，${card.points} 分`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => selectCard(card.id)}
    >
      <span className="card-view__topline">
        <span className="card-view__tier">TIER {card.tier}</span>
        <span className="card-view__points">{card.points} 分</span>
      </span>

      <span className="card-view__art" aria-hidden="true">
        {imageFailed ? (
          <span className="card-view__fallback">{card.imageKey}</span>
        ) : (
          <img
            src={ASSET_PATHS[card.imageKey] ?? card.imageKey}
            alt=""
            onError={() => setImageFailed(true)}
          />
        )}
      </span>

      <span className="card-view__name">{card.name}</span>
      <span className="card-view__bonus">
        奖励 <span className={`token-dot token-dot--${card.bonusType}`} />
        {COLOR_LABELS[card.bonusType]}
      </span>

      <span className="card-view__costs" aria-label="非零费用">
        {costs.length > 0 ? (
          costs.map((color) => (
            <span key={color} className={`cost-chip cost-chip--${color}`}>
              <span className="token-dot" />
              {card.cost[color]}
            </span>
          ))
        ) : (
          <span className="cost-chip cost-chip--free">免费</span>
        )}
      </span>
    </button>
  )
}
