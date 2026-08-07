import { useState } from 'react'
import { ASSET_PATHS } from '../data/assets'
import { CARDS } from '../data/cards'
import {
  STANDARD_TOKEN_COLORS,
  type CardId,
  type PlayerState,
  type StandardTokenColor,
} from '../domain/model'

const COLOR_LABELS: Record<StandardTokenColor, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  psychic: '超能',
}

interface TeamPanelProps {
  player: PlayerState
  selectedCardId: CardId | null
  selectCard: (cardId: CardId | null) => void
  disabled?: boolean
}

interface TeamCardProps {
  cardId: CardId
  reserved: boolean
  selected: boolean
  selectCard: (cardId: CardId) => void
  disabled: boolean
}

function cardAccessibleLabel(card: (typeof CARDS)[number], reserved: boolean) {
  const costs = STANDARD_TOKEN_COLORS.filter((color) => card.cost[color] > 0)
  const costLabel = costs.length > 0
    ? costs.map((color) => `${COLOR_LABELS[color]} ${card.cost[color]}`).join('，')
    : '免费'

  return `${card.name}，${reserved ? '预留卡牌' : '已购买卡牌'}，等级 ${card.tier}，${card.points} 分，奖励 ${COLOR_LABELS[card.bonusType]}，费用 ${costLabel}`
}

function TeamCard({ cardId, reserved, selected, selectCard, disabled }: TeamCardProps) {
  const card = CARDS.find((candidate) => candidate.id === cardId)
  const [imageFailed, setImageFailed] = useState(false)

  if (!card) return null

  const content = (
    <>
      <div className="purchased-card__art" aria-hidden="true">
        {imageFailed ? (
          <span>{card.imageKey}</span>
        ) : (
          <img
            src={ASSET_PATHS[card.imageKey] ?? card.imageKey}
            alt=""
            onError={() => setImageFailed(true)}
          />
        )}
      </div>
      <div className="purchased-card__details">
        <h3>{card.name}</h3>
        <span>{reserved ? '预留 · ' : '奖励 '}{COLOR_LABELS[card.bonusType]}</span>
      </div>
      <strong>{card.points} 分</strong>
    </>
  )

  if (reserved) {
    return (
      <button
        type="button"
        className={`purchased-card purchased-card--reserved${selected ? ' is-selected' : ''}`}
        aria-label={cardAccessibleLabel(card, true)}
        aria-pressed={selected}
        disabled={disabled}
        onClick={() => selectCard(card.id)}
      >
        {content}
      </button>
    )
  }

  return <article className="purchased-card">{content}</article>
}

export default function TeamPanel({ player, selectedCardId, selectCard, disabled = false }: TeamPanelProps) {
  const hasCards = player.purchasedCards.length + player.reservedCards.length > 0

  return (
    <section className="team-panel" role="region" aria-labelledby="team-heading">
      <div className="section-heading section-heading--team">
        <div>
          <span className="section-kicker">YOUR COLLECTION / 04</span>
          <h2 id="team-heading">你的队伍</h2>
        </div>
        <span className="team-panel__count">
          已购 {player.purchasedCards.length} · 预留 {player.reservedCards.length}
        </span>
      </div>

      <div className="team-panel__content">
        <div className="purchased-card-list">
          {player.purchasedCards.map((cardId, index) => (
            <TeamCard
              cardId={cardId}
              disabled={disabled}
              reserved={false}
              selectCard={() => undefined}
              selected={false}
              key={`purchased-${cardId}-${index}`}
            />
          ))}
          {player.reservedCards.map((cardId, index) => (
            <TeamCard
              cardId={cardId}
              disabled={disabled}
              reserved
              selectCard={selectCard}
              selected={selectedCardId === cardId}
              key={`reserved-${cardId}-${index}`}
            />
          ))}
          {!hasCards ? (
            <p className="team-panel__empty">还没有收服宝可梦。购买市场卡牌后，它们会在这里组成你的队伍。</p>
          ) : null}
        </div>

        <div className="bonus-track">
          <div className="bonus-track__heading">
            <span className="section-kicker">PERMANENT BONUSES</span>
            <span>贵族条件依据</span>
          </div>
          <div className="bonus-track__grid">
            {STANDARD_TOKEN_COLORS.map((color) => (
              <span className={`bonus-count bonus-count--${color}`} key={color}>
                <span className="token-dot" />
                <span>{COLOR_LABELS[color]}：{player.bonuses[color]}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
