import { sortPlayersForStandings } from '../domain/endgame'
import type { GameState } from '../domain/model'
import ModalShell from './ModalShell'

interface VictoryOverlayProps {
  state: GameState
  restart: () => void
}

export default function VictoryOverlay({ state, restart }: VictoryOverlayProps) {
  if (state.phase !== 'finished') return null

  const standings = sortPlayersForStandings(state.players)
  const winners = standings.filter((player) => state.winnerIds.includes(player.id))
  const reason =
    winners.length > 1
      ? '积分相同且购买卡数量相同，本局为并列冠军。'
      : '积分优先；若积分相同，则购买卡数量较少者获胜。'

  return (
    <ModalShell
      open
      onClose={restart}
      labelledBy="victory-heading"
      className="victory-overlay"
      backdropClassName="victory-backdrop"
      fallbackSelector="#restart-game-button"
    >
        <span className="section-kicker">LEAGUE CLOSED / FINAL STANDINGS</span>
        <h2 id="victory-heading">联赛结算</h2>
        <p className="victory-overlay__lead">
          {winners.length > 1 ? '本局并列冠军' : `${winners[0]?.name ?? '未知训练家'} 赢得本局`}
        </p>

        <div className="winner-banner">
          <span>冠军</span>
          <strong>{winners.map((winner) => winner.name).join(' · ') || '暂无'}</strong>
        </div>

        <div className="standings-table" role="table" aria-label="最终排名">
          <div className="standings-table__row standings-table__row--heading" role="row">
            <span role="columnheader">训练家</span>
            <span role="columnheader">积分</span>
            <span role="columnheader">已购卡</span>
          </div>
          {standings.map((player) => (
            <div className="standings-table__row" role="row" key={player.id}>
              <span role="cell">
                {player.name}
                {state.winnerIds.includes(player.id) ? <em>冠军</em> : null}
              </span>
              <strong role="cell">{player.points}</strong>
              <span role="cell">{player.purchasedCards.length}</span>
            </div>
          ))}
        </div>

        <p className="tie-break-reason"><strong>判定依据：</strong>{reason}</p>

        <button type="button" className="action-button action-button--primary" onClick={restart}>
          再开一局
        </button>
    </ModalShell>
  )
}
