import { CARDS } from '../data/cards'
import type { CardId, GameState, Tier } from '../domain/model'
import CardView from './CardView'

interface MarketBoardProps {
  state: GameState
  selectedCardId: CardId | null
  selectCard: (cardId: CardId | null) => void
  disabled?: boolean
}

const TIERS: Tier[] = [1, 2, 3]

export default function MarketBoard({
  state,
  selectedCardId,
  selectCard,
  disabled = false,
}: MarketBoardProps) {
  return (
    <section className="market-board" role="region" aria-labelledby="market-heading">
      <div className="section-heading section-heading--market">
        <div>
          <span className="section-kicker">WILD ENCOUNTERS / 01</span>
          <h2 id="market-heading">野外市场</h2>
        </div>
        <p className="section-note">三层牌堆 · 每层四席</p>
      </div>

      <div className="market-layers">
        {TIERS.map((tier) => (
          <section className={`market-layer market-layer--tier-${tier}`} key={tier}>
            <div className="market-layer__heading">
              <div>
                <span className="tier-index">0{tier}</span>
                <h3>等级 {tier}</h3>
              </div>
              <span className="market-layer__deck-count">牌堆余 {state.decks[tier].length}</span>
            </div>
            <div className="market-grid">
              {state.market[tier].map((cardId) => {
                const card = CARDS.find((candidate) => candidate.id === cardId)
                if (!card) return null

                return (
                  <CardView
                    key={card.id}
                    card={card}
                    selected={selectedCardId === card.id}
                    selectCard={selectCard}
                    disabled={disabled}
                  />
                )
              })}
              {state.market[tier].length < 4
                ? Array.from({ length: 4 - state.market[tier].length }, (_, index) => (
                    <div className="card-slot card-slot--empty" key={`empty-${tier}-${index}`}>
                      空席
                    </div>
                  ))
                : null}
            </div>
          </section>
        ))}
      </div>
    </section>
  )
}
