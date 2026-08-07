export const STANDARD_TOKEN_COLORS = ['fire', 'water', 'grass', 'electric', 'psychic'] as const
export const ALL_TOKEN_COLORS = [...STANDARD_TOKEN_COLORS, 'rainbow'] as const

export type StandardTokenColor = (typeof STANDARD_TOKEN_COLORS)[number]
export type TokenColor = (typeof ALL_TOKEN_COLORS)[number]
export type Tier = 1 | 2 | 3
export type PlayerId = 'human' | 'ai-1' | 'ai-2' | 'ai-3'
export type CardId = string
export type NobleId = string
export type CardSource = 'market' | 'reserved'

export type TokenInventory = Record<TokenColor, number>
export type CardCost = Record<StandardTokenColor, number>
export type BonusInventory = Record<StandardTokenColor, number>

export interface Card {
  id: CardId
  tier: Tier
  name: string
  imageKey: string
  points: number
  bonusType: StandardTokenColor
  cost: CardCost
}

export interface Noble {
  id: NobleId
  name: string
  imageKey: string
  points: number
  requirement: BonusInventory
}

export interface PlayerState {
  id: PlayerId
  name: string
  isHuman: boolean
  tokens: TokenInventory
  bonuses: BonusInventory
  purchasedCards: CardId[]
  reservedCards: CardId[]
  nobles: NobleId[]
  points: number
}

export type Action =
  | {
      type: 'take-three-different'
      playerId: PlayerId
      colors: [StandardTokenColor, StandardTokenColor, StandardTokenColor]
    }
  | { type: 'take-two-same'; playerId: PlayerId; color: StandardTokenColor }
  | { type: 'buy-card'; playerId: PlayerId; cardId: CardId; source: CardSource }
  | { type: 'reserve-card'; playerId: PlayerId; cardId: CardId; tier: Tier }

export interface GameEvent {
  type: string
  playerId: PlayerId
  message: string
}

export interface GameState {
  phase: 'playing' | 'final-round' | 'finished'
  players: PlayerState[]
  currentPlayerIndex: number
  decks: Record<Tier, CardId[]>
  market: Record<Tier, CardId[]>
  availableNobles: NobleId[]
  pendingNobleIds: NobleId[]
  pendingNoblePlayerId: PlayerId | null
  tokenBank: TokenInventory
  round: number
  startingPlayerIndex: number
  finalRoundStartIndex: number | null
  winnerIds: PlayerId[]
  randomSeed: number
  eventLog: GameEvent[]
}

export interface RuleError {
  code: string
  message: string
}

export type RuleResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; error: RuleError }
