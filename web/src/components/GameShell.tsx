import { useEffect, useState } from 'react'
import type { GameState } from '../domain/model'
import { useGameSession } from '../game/useGameSession'
import ActionPanel from './ActionPanel'
import MarketBoard from './MarketBoard'
import NoblePanel from './NoblePanel'
import PlayerRail from './PlayerRail'
import RulesModal from './RulesModal'
import TeamPanel from './TeamPanel'
import VictoryOverlay from './VictoryOverlay'

export interface GameShellProps {
  seed?: number
  initialState?: GameState
}

function phaseLabel(phase: GameState['phase']) {
  if (phase === 'final-round') return '最后一轮'
  if (phase === 'finished') return '已结算'
  return '进行中'
}

export default function GameShell({ seed, initialState }: GameShellProps) {
  const session = useGameSession(seed, initialState)
  const [rulesOpen, setRulesOpen] = useState(false)
  const { state, selectedCardId, lastError, pendingNobleIds } = session
  const currentPlayer = state.players[state.currentPlayerIndex]
  const humanPlayer = state.players.find((player) => player.isHuman)
  const humanTurn = currentPlayer?.isHuman ?? false
  const tableLocked = state.phase === 'finished' || pendingNobleIds.length > 0 || !humanTurn
  const rulesVisible = rulesOpen && state.phase !== 'finished'
  const restartGame = () => {
    setRulesOpen(false)
    session.restart()
  }
  const requestRestart = () => {
    if (state.eventLog.length > 0 && state.phase !== 'finished') {
      if (!window.confirm('当前对局尚未结束，重新开始将丢失全部进度。确定要重新开始吗？')) return
    }
    restartGame()
  }

  useEffect(() => {
    if (state.phase === 'finished') setRulesOpen(false)
  }, [state.phase])

  return (
    <>
      <main className="game-shell">
        <header className="top-bar">
          <div className="brand-lockup">
            <span className="brand-lockup__mark" aria-hidden="true">◈</span>
            <div>
              <span className="section-kicker">POKÉMON GEM LEAGUE / SOLO</span>
              <h1>宝可梦宝石联赛</h1>
            </div>
          </div>

          <div className="top-bar__status">
            <div className="top-bar__stat">
              <span>回合</span>
              <strong>{String(state.round).padStart(2, '0')}</strong>
            </div>
            <div className="top-bar__stat top-bar__stat--turn">
              <span>当前回合</span>
              <strong>{currentPlayer?.name ?? '未知玩家'}</strong>
            </div>
            <span className={`phase-chip phase-chip--${state.phase}`}>{phaseLabel(state.phase)}</span>
            <span className={`turn-indicator${humanTurn ? ' is-human' : ' is-ai'}`} role="status">
              <span className="turn-indicator__dot" aria-hidden="true" />
              {humanTurn ? '你的回合' : `电脑行动中 · ${currentPlayer?.name ?? '对手'}`}
            </span>
          </div>

          <div className="top-bar__actions">
            <button id="rules-button" type="button" className="top-bar__button" onClick={() => setRulesOpen(true)}>
              规则
            </button>
            <button id="restart-game-button" type="button" className="top-bar__button top-bar__button--restart" onClick={requestRestart}>
              重新开始
            </button>
          </div>
        </header>

        <div className="table-layout">
          <PlayerRail state={state} />

          <div className="table-center">
            <NoblePanel state={state} claimNoble={session.claimNoble} />
            <MarketBoard
              state={state}
              selectedCardId={selectedCardId}
              selectCard={session.selectCard}
              disabled={tableLocked}
            />
            {humanPlayer ? (
              <TeamPanel
                player={humanPlayer}
                selectedCardId={selectedCardId}
                selectCard={session.selectCard}
                disabled={tableLocked}
              />
            ) : null}
            <section className="event-log" role="region" aria-labelledby="event-log-heading">
              <div className="section-heading section-heading--compact">
                <div>
                  <span className="section-kicker">TABLE LOG / LIVE</span>
                  <h2 id="event-log-heading">对局记录</h2>
                </div>
                <span>{state.eventLog.length} 条记录</span>
              </div>
              <div className="event-log__list" aria-live="polite">
                {state.eventLog.length > 0 ? (
                  state.eventLog
                    .map((event, originalIndex) => ({ event, originalIndex }))
                    .reverse()
                    .slice(0, 6)
                    .map(({ event, originalIndex }) => (
                    <p key={`${event.type}-${event.playerId}-${originalIndex}`}>
                      <span className="event-log__dot" aria-hidden="true" />
                      {event.message}
                    </p>
                  ))
                ) : (
                  <p className="event-log__empty">第一枚宝石还在等待被拿起。</p>
                )}
              </div>
            </section>
          </div>

          <ActionPanel
            state={state}
            selectedCardId={selectedCardId}
            lastError={lastError}
            dispatch={session.dispatch}
          />
        </div>
      </main>

      <RulesModal open={rulesVisible} onClose={() => setRulesOpen(false)} />
      <VictoryOverlay state={state} restart={restartGame} />
    </>
  )
}
