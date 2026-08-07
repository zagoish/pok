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

const COLOR_SHORT_LABELS: Record<StandardTokenColor, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  psychic: '超',
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
  const costLabel = costs.length > 0
    ? costs.map((color) => `${COLOR_LABELS[color]} ${card.cost[color]}`).join('，')
    : '免费'

  return (
    <button
      type="button"
      className={`card-view card-view--tier-${card.tier}${selected ? ' is-selected' : ''}`}
      data-tier={card.tier}
      aria-label={`${card.name} 卡牌，等级 ${card.tier}，${card.points} 分，奖励 ${COLOR_LABELS[card.bonusType]}，费用 ${costLabel}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={() => selectCard(card.id)}
    >
      <span className="card-view__topline">
        <span className="card-view__meta">
          <span className="card-view__bonus" aria-hidden="true">
            <span className={`token-dot token-dot--${card.bonusType} token-dot--bonus`} />
            <span className="card-view__bonus-label">{COLOR_SHORT_LABELS[card.bonusType]}</span>
          </span>
          <span className="card-view__tier">
            <span className={`pokeball pokeball--tier-${card.tier}`} aria-hidden="true" />
          </span>
        </span>
        {card.points > 0 ? (
          <span className="card-view__points" data-count={card.points} aria-hidden="true">
            <span className="card-view__points-value">{card.points}</span>
          </span>
        ) : null}
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

      <span className="card-view__footer">
        <span className="card-view__name">{card.name}</span>

        <span className="card-view__costs" aria-label="非零费用">
          {costs.length > 0 ? (
            costs.map((color) => (
              <span key={color} className={`cost-chip cost-chip--${color}`}>
                <span className="token-dot" aria-hidden="true" />
                {card.cost[color]}
              </span>
            ))
          ) : (
            <span className="cost-chip cost-chip--free">免费</span>
          )}
        </span>
      </span>
    </button>
  )
}
