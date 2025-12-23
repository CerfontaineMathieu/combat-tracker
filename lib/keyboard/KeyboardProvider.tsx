'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { SHORTCUTS } from './shortcuts'
import type { KeyboardContextType, KeyboardActions } from './types'
import { KeyboardHelpDialog } from '@/components/keyboard-help-dialog'

const KeyboardContext = createContext<KeyboardContextType | null>(null)

export function useKeyboardContext() {
  const ctx = useContext(KeyboardContext)
  if (!ctx) {
    throw new Error('useKeyboardContext must be used within KeyboardProvider')
  }
  return ctx
}

function isInputFocused(): boolean {
  const active = document.activeElement
  return (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active?.getAttribute('contenteditable') === 'true'
  )
}

interface KeyboardProviderProps {
  children: React.ReactNode
  actions: KeyboardActions
  mode: 'mj' | 'joueur'
  combatActive: boolean
}

export function KeyboardProvider({ children, actions, mode, combatActive }: KeyboardProviderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  const availableShortcuts = useMemo(() => {
    return SHORTCUTS.filter((s) => {
      if (s.dmOnly && mode !== 'mj') return false
      if (s.playerOnly && mode !== 'joueur') return false
      if (s.requiresCombat && !combatActive) return false
      if (s.requiresNoCombat && combatActive) return false
      return true
    })
  }, [mode, combatActive])

  const openHelp = useCallback(() => setIsHelpOpen(true), [])
  const closeHelp = useCallback(() => setIsHelpOpen(false), [])

  // === COMBAT SHORTCUTS (DM only) ===

  // Start combat (Alt+S)
  useHotkeys(
    'alt+s',
    (e) => {
      if (mode === 'mj' && !combatActive && !isInputFocused()) {
        e.preventDefault()
        actions.startCombat()
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  // Next turn (Space) - DM
  useHotkeys(
    'space',
    (e) => {
      if (isInputFocused()) return
      if (mode === 'mj' && combatActive) {
        e.preventDefault()
        actions.nextTurn()
      } else if (mode === 'joueur' && combatActive) {
        e.preventDefault()
        actions.endPlayerTurn()
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  // Stop combat (Alt+X)
  useHotkeys(
    'alt+x',
    (e) => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        e.preventDefault()
        actions.stopCombat()
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  // Randomize initiatives (Alt+R)
  useHotkeys(
    'alt+r',
    (e) => {
      if (mode === 'mj' && !combatActive && !isInputFocused()) {
        e.preventDefault()
        actions.randomizeInitiatives()
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  // === HP SHORTCUTS (DM only, combat active) ===

  // Damage shortcuts
  useHotkeys(
    '1',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.updateCurrentParticipantHp(-1)
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  useHotkeys(
    '3',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.updateCurrentParticipantHp(-3)
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  useHotkeys(
    '5',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.updateCurrentParticipantHp(-5)
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  useHotkeys(
    '0',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.updateCurrentParticipantHp(-10)
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  // Heal shortcuts
  useHotkeys(
    'shift+1',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.updateCurrentParticipantHp(1)
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  useHotkeys(
    'shift+3',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.updateCurrentParticipantHp(3)
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  useHotkeys(
    'shift+5',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.updateCurrentParticipantHp(5)
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  useHotkeys(
    'shift+0',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.updateCurrentParticipantHp(10)
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  // Open HP dialog (H)
  useHotkeys(
    'h',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.openHpDialog()
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  // === DIALOG SHORTCUTS ===

  // Conditions (C)
  useHotkeys(
    'c',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.openConditionManager()
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  // Buffs (B)
  useHotkeys(
    'b',
    () => {
      if (mode === 'mj' && combatActive && !isInputFocused()) {
        actions.openBuffManager()
      }
    },
    { enableOnFormTags: false },
    [mode, combatActive, actions]
  )

  // Settings (Alt+,)
  useHotkeys(
    'alt+,',
    (e) => {
      if (mode === 'mj' && !isInputFocused()) {
        e.preventDefault()
        actions.openSettings()
      }
    },
    { enableOnFormTags: false },
    [mode, actions]
  )

  // Notes (Alt+N)
  useHotkeys(
    'alt+n',
    (e) => {
      if (mode === 'mj' && !isInputFocused()) {
        e.preventDefault()
        actions.openNotes()
      }
    },
    { enableOnFormTags: false },
    [mode, actions]
  )

  // Help (?)
  useHotkeys(
    'shift+/',
    () => {
      if (!isInputFocused()) {
        openHelp()
      }
    },
    { enableOnFormTags: false },
    [openHelp]
  )

  // === NAVIGATION SHORTCUTS ===

  // Combat/Setup (Alt+1)
  useHotkeys(
    'alt+1',
    (e) => {
      if (!isInputFocused()) {
        e.preventDefault()
        actions.setActiveTab(combatActive ? 'combat' : 'setup')
      }
    },
    { enableOnFormTags: false },
    [combatActive, actions]
  )

  // Bestiary (Alt+2) - DM only
  useHotkeys(
    'alt+2',
    (e) => {
      if (mode === 'mj' && !isInputFocused()) {
        e.preventDefault()
        actions.setActiveTab('bestiary')
      }
    },
    { enableOnFormTags: false },
    [mode, actions]
  )

  // Players/Group (Alt+3)
  useHotkeys(
    'alt+3',
    (e) => {
      if (!isInputFocused()) {
        e.preventDefault()
        actions.setActiveTab('players')
      }
    },
    { enableOnFormTags: false },
    [actions]
  )

  // Loot (Alt+4)
  useHotkeys(
    'alt+4',
    (e) => {
      if (!isInputFocused()) {
        e.preventDefault()
        actions.setActiveTab('loot')
      }
    },
    { enableOnFormTags: false },
    [actions]
  )

  // === PLAYER SHORTCUTS ===

  // Inventory (I)
  useHotkeys(
    'i',
    () => {
      if (mode === 'joueur' && !isInputFocused()) {
        actions.openInventory()
      }
    },
    { enableOnFormTags: false },
    [mode, actions]
  )

  // Spellbook (S)
  useHotkeys(
    's',
    () => {
      if (mode === 'joueur' && !isInputFocused()) {
        actions.openSpellbook()
      }
    },
    { enableOnFormTags: false },
    [mode, actions]
  )

  const value: KeyboardContextType = {
    shortcuts: availableShortcuts,
    isHelpOpen,
    openHelp,
    closeHelp,
  }

  return (
    <KeyboardContext.Provider value={value}>
      {children}
      <KeyboardHelpDialog open={isHelpOpen} onOpenChange={setIsHelpOpen} mode={mode} combatActive={combatActive} />
    </KeyboardContext.Provider>
  )
}
