export type ShortcutCategory =
  | 'combat'
  | 'hp'
  | 'dialogs'
  | 'navigation'
  | 'player'

export interface ShortcutDefinition {
  id: string
  keys: string
  description: string
  category: ShortcutCategory
  dmOnly?: boolean
  playerOnly?: boolean
  requiresCombat?: boolean
  requiresNoCombat?: boolean
}

export interface KeyboardContextType {
  shortcuts: ShortcutDefinition[]
  isHelpOpen: boolean
  openHelp: () => void
  closeHelp: () => void
}

export interface KeyboardActions {
  startCombat: () => void
  nextTurn: () => void
  stopCombat: () => void
  randomizeInitiatives: () => void
  updateCurrentParticipantHp: (change: number) => void
  openHpDialog: () => void
  openConditionManager: () => void
  openBuffManager: () => void
  openSettings: () => void
  openNotes: () => void
  setActiveTab: (tab: string) => void
  openInventory: () => void
  openSpellbook: () => void
  endPlayerTurn: () => void
}
