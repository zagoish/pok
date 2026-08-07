import type { GameState } from './domain/model'
import GameShell from './components/GameShell'
import './App.css'

interface AppProps {
  seed?: number
  initialState?: GameState
}

export default function App({ seed, initialState }: AppProps) {
  return <GameShell seed={seed} initialState={initialState} />
}
