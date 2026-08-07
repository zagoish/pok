import { useEffect, useRef, useState, type RefObject } from 'react'
import { ASSET_PATHS } from '../data/assets'
import { NOBLES } from '../data/nobles'
import {
  STANDARD_TOKEN_COLORS,
  type GameState,
  type Noble,
  type NobleId,
  type StandardTokenColor,
} from '../domain/model'
import ModalShell from './ModalShell'

const COLOR_LABELS: Record<StandardTokenColor, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  psychic: '超能',
}

interface NoblePanelProps {
  state: GameState
  claimNoble: (nobleId: NobleId) => void
}

function requirementText(nobleId: NobleId) {
  const noble = NOBLES.find((candidate) => candidate.id === nobleId)
  if (!noble) return []

  return STANDARD_TOKEN_COLORS.filter((color) => noble.requirement[color] > 0).map((color) => ({
    color,
    label: COLOR_LABELS[color],
    value: noble.requirement[color],
  }))
}

function NobleChoiceContent({
  pendingNobles,
  claimNoble,
  firstButtonRef,
}: {
  pendingNobles: Noble[]
  claimNoble: (nobleId: NobleId) => void
  firstButtonRef: RefObject<HTMLButtonElement | null>
}) {
  return (
    <>
      <span className="section-kicker">BONUS CLAIM / DECISION</span>
      <h2 id="noble-choice-heading">选择贵族</h2>
      <p>本次购买满足多个贵族条件。请选择一位，其他行动暂时锁定。</p>
      <div className="noble-choice__options">
        {pendingNobles.map((noble, index) => (
          <button
            type="button"
            ref={index === 0 ? firstButtonRef : undefined}
            key={noble.id}
            onClick={() => claimNoble(noble.id)}
          >
            <span>{noble.name}</span>
            <strong>+{noble.points} 分</strong>
            <span>选择</span>
          </button>
        ))}
      </div>
    </>
  )
}

export default function NoblePanel({ state, claimNoble }: NoblePanelProps) {
  const [choiceOpen, setChoiceOpen] = useState(true)
  const firstChoiceButtonRef = useRef<HTMLButtonElement | null>(null)
  const nobles = state.availableNobles
    .map((nobleId) => NOBLES.find((noble) => noble.id === nobleId))
    .filter((noble) => noble !== undefined)
  const pendingNobles = state.pendingNobleIds
    .map((nobleId) => NOBLES.find((noble) => noble.id === nobleId))
    .filter((noble) => noble !== undefined)
  const choiceContent = (
    <NobleChoiceContent
      pendingNobles={pendingNobles}
      claimNoble={claimNoble}
      firstButtonRef={firstChoiceButtonRef}
    />
  )

  useEffect(() => {
    if (state.pendingNobleIds.length > 0) setChoiceOpen(true)
  }, [state.pendingNobleIds.length])

  useEffect(() => {
    if (state.pendingNobleIds.length > 0 && !choiceOpen) {
      firstChoiceButtonRef.current?.focus()
    }
  }, [choiceOpen, state.pendingNobleIds.length])

  return (
    <section className="noble-panel" aria-labelledby="noble-heading">
      <div className="section-heading section-heading--noble">
        <div>
          <span className="section-kicker">HONORARY TRAINERS / 02</span>
          <h2 id="noble-heading">贵族训练家</h2>
        </div>
        <span className="noble-panel__count">可遇 {nobles.length}</span>
      </div>

      <div className="noble-grid">
        {nobles.map((noble) => (
          <article className="noble-card" key={noble.id}>
            <div className="noble-card__portrait">
              <img
                src={ASSET_PATHS[noble.imageKey] ?? noble.imageKey}
                alt=""
                onError={(event) => {
                  event.currentTarget.hidden = true
                }}
              />
              <span aria-hidden="true">{noble.name.slice(0, 1)}</span>
            </div>
            <div className="noble-card__body">
              <div className="noble-card__title">
                <h3>{noble.name}</h3>
                <strong>+{noble.points}</strong>
              </div>
              <p>需要已收集的奖励</p>
              <div className="requirement-row">
                {requirementText(noble.id).map((requirement) => (
                  <span key={requirement.color} className={`requirement-chip requirement-chip--${requirement.color}`}>
                    <span className="token-dot" aria-hidden="true" />
                    {requirement.label} {requirement.value}
                  </span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      {state.pendingNobleIds.length > 0 ? (
        choiceOpen ? (
          <ModalShell
            open
            onClose={() => setChoiceOpen(false)}
            labelledBy="noble-choice-heading"
            className="noble-choice"
            backdropClassName="choice-backdrop"
            fallbackSelector="#action-heading"
          >
            {choiceContent}
          </ModalShell>
        ) : (
          <div
            className="noble-choice noble-choice--inline"
            role="region"
            aria-labelledby="noble-choice-heading"
          >
            {choiceContent}
          </div>
        )
      ) : null}
    </section>
  )
}
