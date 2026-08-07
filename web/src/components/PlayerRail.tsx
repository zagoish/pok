import { type GameState, type StandardTokenColor } from '../domain/model'

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

export default function PlayerRail({ state }: PlayerRailProps) {
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

          return (
            <article
              className={`player-card${isCurrent ? ' is-current' : ''}${player.isHuman ? ' is-human' : ''}`}
              key={player.id}
            >
              <div className="player-card__heading">
                <span className="player-card__avatar" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{player.name}</h3>
                {isCurrent ? <span className="player-card__turn">当前回合</span> : null}
              </div>

              <div className="player-card__scoreline">
                <strong>{player.points}</strong>
                <span>积分</span>
              </div>

              <div className="token-strip" aria-label={`${player.name} 的代币`}>
                {TOKEN_COLORS.map((color) => (
                  <span className={`token-count token-count--${color}`} key={color}>
                    <span className={`token-dot token-dot--${color}`} aria-hidden="true" />
                    <span className="token-count__label">{COLOR_LABELS[color]}</span>
                    <strong>{player.tokens[color]}</strong>
                  </span>
                ))}
                <span className="token-count token-count--wild">
                  <span className="token-dot token-dot--rainbow" aria-hidden="true" />
                  <span className="token-count__label">万能</span>
                  <strong>{player.tokens.rainbow}</strong>
                </span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
