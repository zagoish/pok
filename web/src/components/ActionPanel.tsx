import { CARDS } from '../data/cards'
import { getLegalActions } from '../domain/action-legality'
import { totalTokens } from '../domain/inventory'
import {
  STANDARD_TOKEN_COLORS,
  type Action,
  type Card,
  type GameState,
  type StandardTokenColor,
} from '../domain/model'

const COLOR_LABELS: Record<StandardTokenColor, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  psychic: '超能',
}

const THREE_DIFFERENT: Array<[StandardTokenColor, StandardTokenColor, StandardTokenColor]> = [
  ['fire', 'water', 'grass'],
  ['fire', 'water', 'electric'],
  ['fire', 'water', 'psychic'],
  ['fire', 'grass', 'electric'],
  ['fire', 'grass', 'psychic'],
  ['fire', 'electric', 'psychic'],
  ['water', 'grass', 'electric'],
  ['water', 'grass', 'psychic'],
  ['water', 'electric', 'psychic'],
  ['grass', 'electric', 'psychic'],
]

const ACTION_COLORS: StandardTokenColor[] = ['fire', 'water', 'grass', 'electric', 'psychic']

interface ActionPanelProps {
  state: GameState
  selectedCardId: string | null
  lastError: { code: string; message: string } | null
  dispatch: (action: Action) => void
}

function actionKey(action: Action): string {
  return JSON.stringify(action)
}

function isLegalAction(legalActions: Action[], candidate: Action) {
  return legalActions.some((action) => actionKey(action) === actionKey(candidate))
}

function findSelectedCard(selectedCardId: string | null): Card | undefined {
  if (!selectedCardId) return undefined
  return CARDS.find((card) => card.id === selectedCardId)
}

function paymentRows(card: Card, player: GameState['players'][number]) {
  let rainbowPayment = 0

  const rows = STANDARD_TOKEN_COLORS.filter((color) => card.cost[color] > 0).map((color) => {
    const afterBonus = Math.max(0, card.cost[color] - player.bonuses[color])
    const tokenPayment = Math.min(player.tokens[color], afterBonus)
    rainbowPayment += afterBonus - tokenPayment
    return { color, total: card.cost[color], tokenPayment, afterBonus }
  })

  return { rows, rainbowPayment }
}

function TokenPill({ color, count }: { color: StandardTokenColor | 'rainbow'; count: number }) {
  const label = color === 'rainbow' ? '万能' : COLOR_LABELS[color]
  return (
    <span className="action-token-pill">
      <span className={`token-dot token-dot--${color}`} />
      <span>{label}</span>
      <strong>{count}</strong>
    </span>
  )
}

export default function ActionPanel({
  state,
  selectedCardId,
  lastError,
  dispatch,
}: ActionPanelProps) {
  const human = state.players.find((player) => player.id === 'human') ?? state.players[0]
  const currentPlayer = state.players[state.currentPlayerIndex]
  const legalActions = getLegalActions(state, 'human')
  const selectedCard = findSelectedCard(selectedCardId)
  const isHumanTurn = currentPlayer?.id === 'human'
  const locked = !isHumanTurn || state.phase === 'finished' || state.pendingNobleIds.length > 0
  const source = selectedCard && human?.reservedCards.includes(selectedCard.id) ? 'reserved' : 'market'
  const selectedBuyAction = selectedCard && human
    ? ({ type: 'buy-card', playerId: 'human', cardId: selectedCard.id, source } satisfies Action)
    : undefined
  const selectedReserveAction = selectedCard && source === 'market'
    ? ({ type: 'reserve-card', playerId: 'human', cardId: selectedCard.id, tier: selectedCard.tier } satisfies Action)
    : undefined
  const payment = selectedCard && human ? paymentRows(selectedCard, human) : undefined

  return (
    <section className="action-panel" role="region" aria-labelledby="action-heading">
      <div className="section-heading section-heading--action">
        <div>
          <span className="section-kicker">YOUR TURN / 03</span>
          <h2 id="action-heading">你的行动</h2>
        </div>
        <span className={`action-panel__status${isHumanTurn ? ' is-ready' : ' is-waiting'}`} role="status">
          {isHumanTurn ? '可行动' : '等待电脑'}
        </span>
      </div>

      <div className="current-player-banner">
        <span className="current-player-banner__pulse" />
        <div>
          <strong>{currentPlayer?.name ?? '未知训练家'}</strong>
          <span>
            {isHumanTurn ? '这是你的回合' : `电脑行动中 · ${currentPlayer?.name ?? '对手'}`}
          </span>
        </div>
      </div>

      {human ? (
        <div className="resource-block">
          <div className="subsection-heading">
            <h3>你的资源</h3>
            <strong>{totalTokens(human.tokens)} / 10</strong>
          </div>
          <div className="action-token-grid">
            {ACTION_COLORS.map((color) => (
              <TokenPill color={color} count={human.tokens[color]} key={color} />
            ))}
            <TokenPill color="rainbow" count={human.tokens.rainbow} />
          </div>
        </div>
      ) : null}

      <div className="selected-card-panel">
        <div className="subsection-heading">
          <h3>选中卡牌</h3>
          {selectedCard ? <span>准备结算</span> : null}
        </div>
        {selectedCard && human && payment ? (
          <>
            <p className="selected-card-name">已选择：{selectedCard.name}</p>
            <p className="payment-caption">支付信息 · 奖励 {COLOR_LABELS[selectedCard.bonusType]}</p>
            <div className="payment-list">
              {payment.rows.length > 0 ? (
                payment.rows.map((row) => (
                  <div className="payment-row" key={row.color}>
                    <span>
                      <span className={`token-dot token-dot--${row.color}`} />
                      {COLOR_LABELS[row.color]}
                    </span>
                    <span>
                      {row.tokenPayment} / {row.afterBonus}
                      {row.total !== row.afterBonus ? ` · 奖励减免 ${row.total - row.afterBonus}` : ''}
                    </span>
                  </div>
                ))
              ) : (
                <p className="payment-free">无需支付代币</p>
              )}
              {payment.rainbowPayment > 0 ? (
                <div className="payment-row payment-row--wild">
                  <span><span className="token-dot token-dot--rainbow" />万能</span>
                  <strong>{payment.rainbowPayment}</strong>
                </div>
              ) : null}
            </div>
            <div className="selected-card-actions">
              {selectedBuyAction ? (
                <button
                  type="button"
                  className="action-button action-button--primary"
                  disabled={locked || !isLegalAction(legalActions, selectedBuyAction)}
                  onClick={
                    isLegalAction(legalActions, selectedBuyAction)
                      ? () => dispatch(selectedBuyAction)
                      : undefined
                  }
                >
                  购买 {selectedCard.name}
                </button>
              ) : null}
              {selectedReserveAction ? (
                <button
                  type="button"
                  className="action-button action-button--secondary"
                  disabled={locked || !isLegalAction(legalActions, selectedReserveAction)}
                  onClick={
                    isLegalAction(legalActions, selectedReserveAction)
                      ? () => dispatch(selectedReserveAction)
                      : undefined
                  }
                >
                  预留 {selectedCard.name}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="selected-card-empty">从野外市场选择一张卡牌，查看购买或预留方式。</p>
        )}
      </div>

      <div className="token-actions">
        <div className="subsection-heading">
          <h3>拿取代币</h3>
          <span>规则决定可用性</span>
        </div>
        <div className="action-group">
          <span className="action-group__label">三种不同</span>
          <div className="action-button-grid">
            {THREE_DIFFERENT.map((colors) => {
              const action = {
                type: 'take-three-different',
                playerId: 'human',
                colors,
              } satisfies Action
              const legal = isLegalAction(legalActions, action)

              return (
                <button
                  type="button"
                  className="action-button action-button--token"
                  disabled={!legal}
                  onClick={legal ? () => dispatch(action) : undefined}
                  key={colors.join('-')}
                >
                  拿取 {colors.map((color) => COLOR_LABELS[color]).join(' / ')}
                </button>
              )
            })}
          </div>
        </div>
        <div className="action-group">
          <span className="action-group__label">两枚同色</span>
          <div className="action-button-grid action-button-grid--same">
            {ACTION_COLORS.map((color) => {
              const action = { type: 'take-two-same', playerId: 'human', color } satisfies Action
              const legal = isLegalAction(legalActions, action)

              return (
                <button
                  type="button"
                  className="action-button action-button--token"
                  disabled={!legal}
                  onClick={legal ? () => dispatch(action) : undefined}
                  key={color}
                >
                  拿取两枚 {COLOR_LABELS[color]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {lastError ? (
        <div className="rule-error" role="alert">
          <span className="rule-error__code">RULE / {lastError.code}</span>
          <p>{lastError.message}</p>
        </div>
      ) : null}
    </section>
  )
}
