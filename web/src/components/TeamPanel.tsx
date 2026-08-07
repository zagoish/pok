import { useState } from 'react'
import { ASSET_PATHS } from '../data/assets'
import { CARDS } from '../data/cards'
import { STANDARD_TOKEN_COLORS, type PlayerState, type StandardTokenColor } from '../domain/model'

const COLOR_LABELS: Record<StandardTokenColor, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  psychic: '超能',
}

interface TeamPanelProps {
  player: PlayerState
}

function PurchasedCard({ cardId }: { cardId: string }) {
  const card = CARDS.find((candidate) => candidate.id === cardId)
  const [imageFailed, setImageFailed] = useState(false)

  if (!card) return null

  return (
    <article className="purchased-card">
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
        <span>奖励 {COLOR_LABELS[card.bonusType]}</span>
      </div>
      <strong>{card.points} 分</strong>
    </article>
  )
}

export default function TeamPanel({ player }: TeamPanelProps) {
  return (
    <section className="team-panel" role="region" aria-labelledby="team-heading">
      <div className="section-heading section-heading--team">
        <div>
          <span className="section-kicker">YOUR COLLECTION / 04</span>
          <h2 id="team-heading">你的队伍</h2>
        </div>
        <span className="team-panel__count">已购 {player.purchasedCards.length}</span>
      </div>

      <div className="team-panel__content">
        <div className="purchased-card-list">
          {player.purchasedCards.length > 0 ? (
            player.purchasedCards.map((cardId, index) => (
              <PurchasedCard cardId={cardId} key={`${cardId}-${index}`} />
            ))
          ) : (
            <p className="team-panel__empty">还没有收服宝可梦。购买市场卡牌后，它们会在这里组成你的队伍。</p>
          )}
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
