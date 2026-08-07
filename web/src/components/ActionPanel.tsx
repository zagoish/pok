import { useEffect, useState, type CSSProperties } from 'react'
import { CARDS } from '../data/cards'
import { getLegalActions } from '../domain/action-legality'
import { totalTokens } from '../domain/inventory'
import { getPaymentBreakdown } from '../domain/payment'
import {
  STANDARD_TOKEN_COLORS,
  type Action,
  type Card,
  type GameState,
  type StandardTokenColor,
} from '../domain/model'
import TokenStack, { COLOR_LABELS, RAINBOW_LABEL, tokenStackHeight } from './TokenStack'

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

function TokenPill({ color, count }: { color: StandardTokenColor | 'rainbow'; count: number }) {
  const label = color === 'rainbow' ? RAINBOW_LABEL : COLOR_LABELS[color]
  return (
    <span className="action-token-pill">
      <span className={`token-dot token-dot--${color}`} aria-hidden="true" />
      <span>{label}</span>
      <strong>{count}</strong>
    </span>
  )
}

const MAX_VISIBLE_BANK_CHIPS = 8

function BankStack({
  color,
  held,
  bank,
}: {
  color: StandardTokenColor | 'rainbow'
  held: number
  bank: number
}) {
  const label = color === 'rainbow' ? RAINBOW_LABEL : COLOR_LABELS[color]
  const height = tokenStackHeight(bank)
  const chipCount = Math.min(Math.max(bank, 0), MAX_VISIBLE_BANK_CHIPS)
  const style = { '--stack-height': `${height}px` } as CSSProperties

  return (
    <div
      className={`token-stack token-stack--bank token-stack--${color}`}
      style={style}
      aria-label={`${label} · 持有 ${held} · 银行 ${bank}`}
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
      <strong className="token-stack__held">{bank}</strong>
      <span className="token-stack__bank">银行 {bank}</span>
    </div>
  )
}

interface Hint {
  kind: 'success' | 'error'
  text: string
}

function formedAction(selection: StandardTokenColor[]): Action | null {
  if (selection.length === 3 && new Set(selection).size === 3) {
    return {
      type: 'take-three-different',
      playerId: 'human',
      colors: selection as [StandardTokenColor, StandardTokenColor, StandardTokenColor],
    }
  }
  if (selection.length === 2 && selection[0] === selection[1]) {
    return { type: 'take-two-same', playerId: 'human', color: selection[0] }
  }
  return null
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
  const [selection, setSelection] = useState<StandardTokenColor[]>([])
  const [hint, setHint] = useState<Hint | null>(null)
  const formed = formedAction(selection)

  useEffect(() => {
    if (locked) {
      setSelection([])
      setHint(null)
    }
  }, [locked])

  const handleStackPick = (color: StandardTokenColor) => {
    const picked = selection.filter((candidate) => candidate === color).length

    if (picked >= 2) {
      setHint({ kind: 'error', text: '不能拿取三个相同徽章' })
      return
    }

    if (picked === 1) {
      if (state.tokenBank[color] < 4) {
        setHint({ kind: 'error', text: '银行该色不足四枚' })
        return
      }
      setSelection([color, color])
      setHint({ kind: 'success', text: `已选择：拿取两枚${COLOR_LABELS[color]}徽章` })
      return
    }

    if (selection.length >= 3) return

    const next = [...selection, color]
    setSelection(next)
    if (next.length === 3) {
      setHint({
        kind: 'success',
        text: `已选择：拿取三枚不同徽章（${next.map((candidate) => COLOR_LABELS[candidate]).join('、')}）`,
      })
    } else {
      setHint(null)
    }
  }

  const removePick = (index: number) => {
    setSelection((current) => current.filter((_, candidateIndex) => candidateIndex !== index))
    setHint(null)
  }

  const confirmTake = () => {
    if (!formed) return
    dispatch(formed)
    setSelection([])
    setHint(null)
  }
  const source = selectedCard && human?.reservedCards.includes(selectedCard.id) ? 'reserved' : 'market'
  const selectedBuyAction = selectedCard && human
    ? ({ type: 'buy-card', playerId: 'human', cardId: selectedCard.id, source } satisfies Action)
    : undefined
  const selectedReserveAction = selectedCard && source === 'market'
    ? ({ type: 'reserve-card', playerId: 'human', cardId: selectedCard.id, tier: selectedCard.tier } satisfies Action)
    : undefined
  const payment = selectedCard && human ? getPaymentBreakdown(selectedCard, human) : undefined

  return (
    <section className="action-panel" role="region" aria-labelledby="action-heading">
      <div className="section-heading section-heading--action">
        <div>
          <span className="section-kicker">YOUR TURN / 03</span>
          <h2 id="action-heading" tabIndex={-1}>你的行动</h2>
        </div>
        <span className={`action-panel__status${isHumanTurn ? ' is-ready' : ' is-waiting'}`} role="status">
          {isHumanTurn ? '可行动' : '等待电脑'}
        </span>
      </div>

      <div className="current-player-banner">
        <span className="current-player-banner__pulse" aria-hidden="true" />
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
            {STANDARD_TOKEN_COLORS.map((color) => (
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
                      <span className={`token-dot token-dot--${row.color}`} aria-hidden="true" />
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
                  <span><span className="token-dot token-dot--rainbow" aria-hidden="true" />万能</span>
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
          <h3>拿取徽章</h3>
          <span>点击堆叠选择</span>
        </div>
        <div className="token-stack-row">
          {STANDARD_TOKEN_COLORS.map((color) => (
            <TokenStack
              key={color}
              color={color}
              held={human.tokens[color]}
              bank={state.tokenBank[color]}
              selected={selection.includes(color)}
              disabled={locked || state.tokenBank[color] === 0}
              onPick={() => handleStackPick(color)}
            />
          ))}
          <TokenStack
            color="rainbow"
            held={human.tokens.rainbow}
            bank={state.tokenBank.rainbow}
            selected={false}
            disabled={locked}
            onPick={() => setHint({ kind: 'error', text: '彩虹能量只能通过预留或购买获得' })}
          />
        </div>
        <div className="bank-group" role="group" aria-label="银行">
          <div className="subsection-heading">
            <h3>银行</h3>
            <span>公共储备</span>
          </div>
          <div className="token-stack-row">
            {STANDARD_TOKEN_COLORS.map((color) => (
              <BankStack
                key={color}
                color={color}
                held={human.tokens[color]}
                bank={state.tokenBank[color]}
              />
            ))}
            <BankStack
              color="rainbow"
              held={human.tokens.rainbow}
              bank={state.tokenBank.rainbow}
            />
          </div>
        </div>
        {selection.length > 0 || hint ? (
          <div className="token-selection">
            <div className="token-selection__chips">
              {selection.map((color, index) => (
                <button
                  type="button"
                  key={`${color}-${index}`}
                  className={`picked-chip picked-chip--${color}`}
                  aria-label={`移除${COLOR_LABELS[color]}徽章`}
                  onClick={() => removePick(index)}
                >
                  <span className={`token-dot token-dot--${color}`} aria-hidden="true" />
                  {COLOR_LABELS[color]}
                </button>
              ))}
            </div>
            {hint ? (
              hint.kind === 'error' ? (
                <p className="token-hint token-hint--error" role="alert">{hint.text}</p>
              ) : (
                <p className="token-hint token-hint--success" role="status">{hint.text}</p>
              )
            ) : null}
            {formed ? (
              <button
                type="button"
                className="action-button action-button--primary token-confirm"
                onClick={confirmTake}
              >
                执行拿取
              </button>
            ) : null}
          </div>
        ) : null}
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
