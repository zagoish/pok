import { totalTokens } from '../domain/inventory'
import { type GameState, type PlayerId, type StandardTokenColor } from '../domain/model'

const TOKEN_COLORS: StandardTokenColor[] = ['fire', 'water', 'grass', 'electric', 'psychic']

const COLOR_LABELS: Record<StandardTokenColor, string> = {
  fire: '火',
  water: '水',
  grass: '草',
  electric: '电',
  psychic: '超能',
}

interface PlayerRailProps {
  state: GameState
}

function playerLatestEvent(state: GameState, playerId: PlayerId) {
  for (let index = state.eventLog.length - 1; index >= 0; index -= 1) {
    if (state.eventLog[index].playerId === playerId) return state.eventLog[index]
  }
  return undefined
}

export default function PlayerRail({ state }: PlayerRailProps) {
  const latestEvent = state.eventLog[state.eventLog.length - 1]

  return (
    <section className="player-rail" role="region" aria-labelledby="player-rail-heading">
      <div className="section-heading section-heading--rail">
        <div>
          <span className="section-kicker">LEAGUE TABLE / 00</span>
          <h2 id="player-rail-heading">训练家进度</h2>
        </div>
        <span className="player-rail__round">ROUND {String(state.round).padStart(2, '0')}</span>
      </div>

      <div className="player-list">
        {state.players.map((player, index) => {
          const isCurrent = index === state.currentPlayerIndex
          const event = playerLatestEvent(state, player.id)

          return (
            <article
              className={`player-card${isCurrent ? ' is-current' : ''}${player.isHuman ? ' is-human' : ''}`}
              key={player.id}
            >
              <div className="player-card__heading">
                <div>
                  <span className="player-card__seed">0{index + 1}</span>
                  <h3>{player.name}</h3>
                </div>
                {isCurrent ? <span className="player-card__turn">当前回合</span> : null}
              </div>

              <div className="player-card__scoreline">
                <strong>{player.points}</strong>
                <span>积分</span>
              </div>

              <div className="player-metrics">
                <p className="metric">代币总数：{totalTokens(player.tokens)}</p>
                <p className="metric">已购卡：{player.purchasedCards.length}</p>
                <p className="metric">预留卡：{player.reservedCards.length}</p>
                <p className="metric">贵族：{player.nobles.length}</p>
              </div>

              <div className="token-strip" aria-label={`${player.name} 的代币`}>
                {TOKEN_COLORS.map((color) => (
                  <span className="token-count" key={color}>
                    <span className={`token-dot token-dot--${color}`} />
                    <span>{COLOR_LABELS[color]}</span>
                    <strong>{player.tokens[color]}</strong>
                  </span>
                ))}
                <span className="token-count token-count--wild">
                  <span className="token-dot token-dot--rainbow" />
                  <span>万能</span>
                  <strong>{player.tokens.rainbow}</strong>
                </span>
              </div>

              <p className="player-card__event">
                <span>最近动作</span>
                {event ? event.message : '尚未发生动作'}
              </p>
            </article>
          )
        })}
      </div>

      <div className="latest-event">
        <span className="section-kicker">LATEST EVENT</span>
        <p>{latestEvent?.message ?? '牌桌已就位，等待第一位训练家行动。'}</p>
      </div>
    </section>
  )
}
