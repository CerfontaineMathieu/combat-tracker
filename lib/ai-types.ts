// AI Assistant Types - Stub file for build compatibility

export interface CombatParticipantContext {
  name: string
  type: 'player' | 'monster'
  currentHp: number
  maxHp: number
  ac: number
  conditions: string[]
  isCurrentTurn: boolean
}

export interface CombatContext {
  isActive: boolean
  round: number
  currentTurn: number
  participants: CombatParticipantContext[]
}
