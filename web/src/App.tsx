import { useGameSession } from './game/useGameSession'

export default function App() {
  const { state, lastError, pendingNobleIds, restart } = useGameSession()
  const currentPlayer = state.players[state.currentPlayerIndex]

  return (
    <main>
      <h1>宝可梦宝石联赛</h1>
      <p>
        第 {state.round} 轮 · 当前回合：{currentPlayer?.name ?? '未知玩家'}
      </p>
      <p>待选择贵族：{pendingNobleIds.length}</p>
      {lastError ? <p role="alert">{lastError.message}</p> : null}
      <button type="button" onClick={restart}>
        重新开始
      </button>
    </main>
  )
}
