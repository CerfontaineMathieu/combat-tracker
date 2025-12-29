"use client"

import { useState, useEffect, useMemo, useRef, Suspense } from "react"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Header } from "@/components/header"
import { MobileNav, type MobileTab } from "@/components/mobile-nav"
import { PlayerPanel } from "@/components/player-panel"
import { MyCharactersPanel } from "@/components/my-characters-panel"
import { CombatPanel } from "@/components/combat-panel"
import { CombatSetupPanel } from "@/components/combat-setup-panel"
import { CombatDndProvider } from "@/components/combat-dnd-context"
import { BestiaryPanel } from "@/components/bestiary-panel"
import { MobileCombatSetup } from "@/components/mobile-combat-setup"
import { MonsterPickerPanel } from "@/components/monster-picker-panel"
import { CombatHistoryPanel, type HistoryEntry } from "@/components/combat-history-panel"
import { SettingsPanel } from "@/components/settings-panel"
import { UserSelectionScreen } from "@/components/user-selection-screen"
import { LoadingSkeleton } from "@/components/loading-skeleton"
import { toast } from "sonner"
import { useSocketContext } from "@/lib/socket-context"
import type { Character, Monster, CombatParticipant, DbMonster, CharacterInventory, ActiveBuff, Note } from "@/lib/types"
import { DEFAULT_INVENTORY } from "@/lib/types"
import { AmbientEffects, type AmbientEffect } from "@/components/ambient-effects"
import { XpSummaryModal } from "@/components/xp-summary-modal"
import { OrphanPetDialog } from "@/components/orphan-pet-dialog"
import { ConcentrationCheckDialog } from "@/components/concentration-check-dialog"
import { GroupSaveDialog } from "@/components/group-save-dialog"
import { GroupSaveResultsDialog } from "@/components/group-save-results-dialog"
import { GroupSavePlayerDialog } from "@/components/group-save-player-dialog"
import { SpellbookPanel } from "@/components/spellbook-panel"
import { NotesPanel } from "@/components/notes-panel"
import { AIAssistantPanel } from "@/components/ai-assistant-panel"
import { LootPanelConnected, LootDistributionSummaryDialog } from "@/components/loot"
import type { CombatContext } from "@/lib/ai-types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus, Minus, NotebookPen } from "lucide-react"
import { KeyboardProvider } from "@/lib/keyboard"
import type { KeyboardActions } from "@/lib/keyboard"

// Default campaign ID (single session)
const DEFAULT_CAMPAIGN_ID = 1

// Character info from selection screen
interface SelectedCharacter {
  id: string | number
  name: string
  class: string
  level: number
  current_hp: number
  max_hp: number
  ac: number
  initiative: number
  conditions: string[]
  max_spell_slots?: Record<number, number> | null
  is_warlock?: boolean
}

// Type alias for easier reading
type SelectedCharacters = SelectedCharacter[]

// Extract numeric ID from prefixed ID (e.g., "p-1" -> 1, "m-2" -> 2)
function getNumericId(prefixedId: string): number {
  return parseInt(prefixedId.split('-')[1], 10)
}

function CombatTrackerContent() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<MobileTab>("setup")

  // Socket context
  const {
    state: socketState,
    dispatch: socketDispatch,
    joinCampaign,
    leaveCampaign,
    emitCombatUpdate,
    emitHpChange,
    emitConditionChange,
    emitExhaustionChange,
    emitBuffChange,
    emitDeathSaveChange,
    emitInventoryUpdate,
    emitSpellSlotChange,
    emitAmbientEffect,
    createLootSession,
    clearLootSession,
    // Group saving throws
    initiateGroupSave,
    submitGroupSaveResult,
    cancelGroupSave,
    clearGroupSave,
  } = useSocketContext()

  // User selection state - null means not selected yet
  const [userSelected, setUserSelected] = useState(false)
  const [mode, setMode] = useState<"mj" | "joueur">("mj")
  const [selectedCharacters, setSelectedCharacters] = useState<SelectedCharacters>([])

  // Fixed campaign ID (single session)
  const campaignId = DEFAULT_CAMPAIGN_ID
  const [campaignName, setCampaignName] = useState("")
  const [players, setPlayers] = useState<Character[]>([])
  const [allCampaignCharacters, setAllCampaignCharacters] = useState<Character[]>([])
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [combatActive, setCombatActive] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('dnd-combatActive') === 'true'
  })
  const [currentTurn, setCurrentTurn] = useState(() => {
    if (typeof window === 'undefined') return 0
    const stored = sessionStorage.getItem('dnd-currentTurn')
    return stored ? parseInt(stored, 10) : 0
  })
  const [roundNumber, setRoundNumber] = useState(() => {
    if (typeof window === 'undefined') return 1
    const stored = sessionStorage.getItem('dnd-roundNumber')
    return stored ? parseInt(stored, 10) : 1
  })
  const [combatParticipants, setCombatParticipants] = useState<CombatParticipant[]>(() => {
    if (typeof window === 'undefined') return []
    const stored = sessionStorage.getItem('dnd-combatParticipants')
    return stored ? JSON.parse(stored) : []
  })
  const [loading, setLoading] = useState(true)

  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  // Keyboard shortcut dialog control
  const [keyboardConditionDialogOpen, setKeyboardConditionDialogOpen] = useState(false)
  const [keyboardBuffDialogOpen, setKeyboardBuffDialogOpen] = useState(false)
  const [keyboardHpDialogOpen, setKeyboardHpDialogOpen] = useState(false)
  const [sessionNotes, setSessionNotes] = useState<Note[]>([])
  const [isSyncingNotes, setIsSyncingNotes] = useState(false)
  const [combatHistory, setCombatHistory] = useState<HistoryEntry[]>([])
  // Track initiative overrides for players (session-only, not persisted)
  const [playerInitiatives, setPlayerInitiatives] = useState<Record<string, number>>({})
  const [ambientEffect, setAmbientEffect] = useState<AmbientEffect>(() => {
    if (typeof window === 'undefined') return "none"
    return (sessionStorage.getItem('dnd-ambientEffect') as AmbientEffect) || "none"
  })

  // State for monster drop quantity dialog
  const [pendingDropMonster, setPendingDropMonster] = useState<DbMonster | null>(null)
  const [dropQuantity, setDropQuantity] = useState(1)

  // State for DM login
  const [dmError, setDmError] = useState<string | null>(null)
  const [dmLoading, setDmLoading] = useState(false)
  const [pendingDmPassword, setPendingDmPassword] = useState<string | null>(null)

  // State for monster list refresh (incremented after Notion sync)
  const [monsterRefreshKey, setMonsterRefreshKey] = useState(0)

  // State for XP summary modal
  const [showXpModal, setShowXpModal] = useState(false)
  const [xpSummaryData, setXpSummaryData] = useState<{ killedMonsters: { name: string; xp: number }[]; playerCount: number }>({
    killedMonsters: [],
    playerCount: 0,
  })

  // State for orphan pet dialog (when removing an owner with pets)
  const [orphanPetDialog, setOrphanPetDialog] = useState<{
    owner: CombatParticipant
    pets: CombatParticipant[]
  } | null>(null)

  // State for concentration check dialog (when concentrated participant takes damage)
  const [concentrationCheck, setConcentrationCheck] = useState<{
    participantId: string
    participantName: string
    participantType: 'player' | 'monster'
    damage: number
    dc: number
    pendingChange: number // The HP change to apply after check
  } | null>(null)

  // State for AI Assistant sidebar (DM only, desktop only)
  const [showAIAssistant, setShowAIAssistant] = useState(false)

  // State for loot distribution summary dialog
  const [showLootSummary, setShowLootSummary] = useState(false)

  // State for group save config dialog (DM only)
  const [showGroupSaveConfig, setShowGroupSaveConfig] = useState(false)

  // Track if we've done the initial loot tab restore (to avoid forcing user back to loot)
  const lootTabRestoredRef = useRef(false)

  // Show loot distribution summary when finalized, or clear session if empty
  useEffect(() => {
    if (socketState.lootDistributions) {
      if (socketState.lootDistributions.length > 0) {
        setShowLootSummary(true)
      } else {
        // No distributions (empty loot) - clear session immediately
        clearLootSession()
      }
    }
  }, [socketState.lootDistributions, clearLootSession])

  // Handle closing the loot summary dialog
  const handleCloseLootSummary = () => {
    setShowLootSummary(false)
    clearLootSession()
  }

  // Persist combat state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('dnd-combatActive', String(combatActive))
  }, [combatActive])

  useEffect(() => {
    sessionStorage.setItem('dnd-currentTurn', String(currentTurn))
  }, [currentTurn])

  useEffect(() => {
    sessionStorage.setItem('dnd-roundNumber', String(roundNumber))
  }, [roundNumber])

  useEffect(() => {
    sessionStorage.setItem('dnd-combatParticipants', JSON.stringify(combatParticipants))
  }, [combatParticipants])

  useEffect(() => {
    sessionStorage.setItem('dnd-ambientEffect', ambientEffect)
  }, [ambientEffect])

  // Handle concentration check requests from players (DM only)
  useEffect(() => {
    if (mode === 'mj' && socketState.pendingConcentrationRequest) {
      const req = socketState.pendingConcentrationRequest
      setConcentrationCheck({
        participantId: req.participantId,
        participantName: req.participantName,
        participantType: req.participantType,
        damage: req.damage,
        dc: req.dc,
        pendingChange: 0, // HP already applied by player
      })
      // Clear the pending request
      socketDispatch({ type: 'CLEAR_CONCENTRATION_REQUEST' })
    }
  }, [mode, socketState.pendingConcentrationRequest, socketDispatch])

  // Set default tab based on mode when mode changes (login)
  // Players should start on "players" tab (Mes Personnages), DM on "setup"
  useEffect(() => {
    if (mode === "joueur") {
      // Only redirect from tabs that don't exist for players
      if (activeTab === "setup" || activeTab === "bestiary") {
        setActiveTab("players")
      }
    }
    // Fetch session notes when DM logs in
    if (mode === "mj" && userSelected) {
      fetchSessionNotes()
    }
  }, [mode, userSelected]) // Run when mode changes or user is selected

  // Switch mobile tab when combat starts/stops (DM only)
  useEffect(() => {
    if (isMobile && mode === "mj") {
      if (combatActive && activeTab === "setup") {
        setActiveTab("combat")
      } else if (!combatActive && activeTab === "combat") {
        setActiveTab("setup")
      }
    }
  }, [combatActive, isMobile, mode, activeTab])

  // Switch to loot tab on mobile when a loot session becomes available (after refresh)
  // Only do this once per session to avoid forcing the user back to loot if they navigate away
  useEffect(() => {
    if (socketState.lootSession && !lootTabRestoredRef.current) {
      lootTabRestoredRef.current = true
      // For players on mobile, auto-switch to loot tab when session is restored
      if (isMobile && mode === "joueur" && activeTab !== "loot") {
        setActiveTab("loot")
      }
    }
    // Reset the flag when loot session ends
    if (!socketState.lootSession) {
      lootTabRestoredRef.current = false
    }
  }, [isMobile, socketState.lootSession, mode, activeTab])

  // Auto-end combat when all monsters are dead (DM only)
  useEffect(() => {
    if (!combatActive || mode !== "mj") return

    const monsters = combatParticipants.filter(p => p.type === "monster")
    const aliveMonsters = monsters.filter(p => p.currentHp > 0)

    // Only auto-end if there were monsters and now all are dead
    if (monsters.length > 0 && aliveMonsters.length === 0) {
      // Small delay to let the UI update with the last kill
      const timer = setTimeout(() => {
        stopCombat()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [combatParticipants, combatActive, mode])

  // Restore mode from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("combatTrackerMode") as "mj" | "joueur" | null
    if (savedMode) {
      setMode(savedMode)
      if (savedMode === "joueur") {
        const savedCharacters = localStorage.getItem("combatTrackerCharacters")
        if (savedCharacters) {
          try {
            const charactersData = JSON.parse(savedCharacters)
            // Also restore to sessionStorage for socket connection
            sessionStorage.setItem("selectedCharacters", savedCharacters)

            // Reload inventories from database to ensure fresh data
            const loadInventoriesAndRestore = async () => {
              const charactersWithInventories = await Promise.all(
                charactersData.map(async (char: { odNumber: string | number; name: string; class: string; level: number; currentHp: number; maxHp: number; ac: number; initiative: number; conditions: string[]; inventory?: CharacterInventory }) => {
                  console.log('[Inventory] Loading inventory for character:', char.odNumber)
                  let inventory = DEFAULT_INVENTORY
                  try {
                    const response = await fetch(`/api/characters/${char.odNumber}/inventory`)
                    if (response.ok) {
                      inventory = await response.json()
                      console.log('[Inventory] Loaded from database:', char.odNumber, inventory)
                    } else {
                      console.warn('[Inventory] Failed to load - HTTP', response.status, 'for character:', char.odNumber)
                    }
                  } catch (error) {
                    console.error('Failed to load inventory for character:', char.odNumber, error)
                  }

                  return {
                    id: char.odNumber,
                    name: char.name,
                    class: char.class,
                    level: char.level,
                    current_hp: char.currentHp,
                    max_hp: char.maxHp,
                    ac: char.ac,
                    initiative: char.initiative,
                    conditions: char.conditions,
                    inventory,
                  }
                })
              )
              setSelectedCharacters(charactersWithInventories)
              setUserSelected(true)
            }

            loadInventoriesAndRestore()
          } catch {
            // Invalid data, clear it
            localStorage.removeItem("combatTrackerCharacters")
            localStorage.removeItem("combatTrackerMode")
          }
        }
      } else {
        setUserSelected(true)
      }
    }
  }, [])

  // Handle MJ selection
  const handleSelectMJ = (password: string) => {
    setDmError(null)
    setDmLoading(true)
    setPendingDmPassword(password) // Store password temporarily until validated

    // Join campaign as DM with password
    if (socketState.isConnected) {
      console.log('[Socket] User selected MJ, joining as DM')
      joinCampaign({ role: 'dm', password })
    } else {
      // Socket not ready yet
      setDmLoading(false)
      setDmError("Connexion au serveur en cours...")
      setPendingDmPassword(null)
    }
  }

  // Load status (HP, tempHp, exhaustion, conditions, conditionDurations, buffs) from database for a character
  interface CharacterStatus {
    currentHp: number | null
    tempHp: number | null
    exhaustionLevel: number | null
    conditions: string[] | null
    conditionDurations: Record<string, number> | null
    buffs: ActiveBuff[] | null
    spellSlots: Record<number, number> | null
  }
  const loadCharacterStatus = async (characterId: string): Promise<CharacterStatus> => {
    try {
      const response = await fetch(`/api/characters/${characterId}/hp`)
      if (response.ok) {
        const data = await response.json()
        console.log('[Status] Loaded from database:', characterId, data)
        return {
          currentHp: data.currentHp ?? null,
          tempHp: data.tempHp ?? null,
          exhaustionLevel: data.exhaustionLevel ?? null,
          conditions: data.conditions ?? null,
          conditionDurations: data.conditionDurations ?? null,
          buffs: data.buffs ?? null,
          spellSlots: data.spellSlots ?? null
        }
      }
    } catch (error) {
      console.error('Failed to load status for character:', characterId, error)
    }
    return { currentHp: null, tempHp: null, exhaustionLevel: null, conditions: null, conditionDurations: null, buffs: null, spellSlots: null }
  }

  // Load inventory from database for a character
  const loadCharacterInventory = async (characterId: string): Promise<CharacterInventory> => {
    console.log('[Inventory] Loading inventory for character:', characterId)
    try {
      const response = await fetch(`/api/characters/${characterId}/inventory`)
      if (response.ok) {
        const inventory = await response.json()
        console.log('[Inventory] Loaded from database:', characterId, inventory)
        return inventory
      } else {
        console.warn('[Inventory] Failed to load - HTTP', response.status, 'for character:', characterId)
      }
    } catch (error) {
      console.error('Failed to load inventory for character:', characterId, error)
    }
    console.log('[Inventory] Returning default inventory for:', characterId)
    return DEFAULT_INVENTORY
  }

  // Handle players selection (multiple characters)
  const handleSelectPlayers = async (characters: SelectedCharacters) => {
    setMode("joueur")
    setSelectedCharacters(characters)
    setUserSelected(true)
    // Persist mode and characters to localStorage
    localStorage.setItem("combatTrackerMode", "joueur")
    if (characters.length > 0) {
      // Load inventories and status from database for each character
      const charactersWithData = await Promise.all(
        characters.map(async (char) => {
          const charIdStr = String(char.id)
          const [inventory, persistedStatus] = await Promise.all([
            loadCharacterInventory(charIdStr),
            loadCharacterStatus(charIdStr),
          ])
          return {
            odNumber: char.id,
            name: char.name,
            class: char.class,
            level: char.level,
            currentHp: persistedStatus.currentHp ?? char.current_hp,
            tempHp: persistedStatus.tempHp ?? undefined,
            maxHp: char.max_hp,
            ac: char.ac,
            initiative: char.initiative,
            conditions: persistedStatus.conditions ?? char.conditions ?? [],
            conditionDurations: persistedStatus.conditionDurations ?? {},
            exhaustionLevel: persistedStatus.exhaustionLevel ?? 0,
            buffs: persistedStatus.buffs ?? [],
            inventory,
            // Spell slots: use persisted if available, otherwise default to max from Notion
            maxSpellSlots: char.max_spell_slots ?? undefined,
            spellSlots: persistedStatus.spellSlots ?? char.max_spell_slots ?? undefined,
            isWarlock: char.is_warlock ?? false,
          }
        })
      )

      localStorage.setItem("combatTrackerCharacters", JSON.stringify(charactersWithData))
      // Also keep in sessionStorage for backward compatibility
      sessionStorage.setItem("selectedCharacters", JSON.stringify(charactersWithData))
      // Join campaign as player with characters
      if (socketState.isConnected) {
        console.log('[Socket] User selected player with characters:', charactersWithData.map(c => c.name).join(', '))
        joinCampaign({ role: 'player', characters: charactersWithData })
      }
    }
  }

  // Fetch campaign data on mount
  useEffect(() => {
    async function fetchCampaignData() {
      console.log('[Campaign] Fetching campaign data...')
      try {
        setLoading(true)

        // Fetch campaign info
        const campaignRes = await fetch(`/api/campaigns/${campaignId}`)
        if (campaignRes.ok) {
          const campaign = await campaignRes.json()
          setCampaignName(campaign.name)
        }

        // Fetch characters from Notion
        const charactersRes = await fetch('/api/characters/notion')
        if (charactersRes.ok) {
          const charactersData = await charactersRes.json()
          // Map Notion fields to frontend fields and load inventories
          const mappedCharacters = await Promise.all(
            charactersData.map(async (c: {
              id: string
              name: string
              class: string
              level: number
              current_hp: number
              max_hp: number
              ac: number
              initiative: number
              conditions: string[]
              passive_perception: number | null
              strength: number | null
              dexterity: number | null
              constitution: number | null
              intelligence: number | null
              wisdom: number | null
              charisma: number | null
              max_spell_slots: Record<number, number> | null
              is_warlock: boolean
              saving_throw_proficiencies: string[]
            }) => {
              // Load persisted data from database in parallel
              const [inventory, persistedStatus] = await Promise.all([
                loadCharacterInventory(c.id),
                loadCharacterStatus(c.id),
              ])
              return {
                id: c.id,
                name: c.name,
                class: c.class,
                level: c.level,
                // Use persisted values if available, otherwise use Notion values
                currentHp: persistedStatus.currentHp ?? c.current_hp,
                tempHp: persistedStatus.tempHp ?? undefined,
                maxHp: c.max_hp,
                ac: c.ac,
                initiative: c.initiative,
                conditions: persistedStatus.conditions ?? c.conditions ?? [],
                conditionDurations: persistedStatus.conditionDurations ?? {},
                exhaustionLevel: persistedStatus.exhaustionLevel ?? 0,
                buffs: persistedStatus.buffs ?? [],
                isConnected: false,
                inventory,
                passivePerception: c.passive_perception,
                strength: c.strength,
                dexterity: c.dexterity,
                constitution: c.constitution,
                intelligence: c.intelligence,
                wisdom: c.wisdom,
                charisma: c.charisma,
                savingThrowProficiencies: c.saving_throw_proficiencies,
                // Spell slots: use persisted if available, otherwise default to max from Notion
                maxSpellSlots: c.max_spell_slots ?? undefined,
                spellSlots: persistedStatus.spellSlots ?? c.max_spell_slots ?? undefined,
                isWarlock: c.is_warlock,
              }
            })
          )
          setPlayers(mappedCharacters)
          setAllCampaignCharacters(mappedCharacters)
        }

        // Fetch combat monsters
        const monstersRes = await fetch(`/api/campaigns/${campaignId}/combat-monsters`)
        if (monstersRes.ok) {
          const monstersData = await monstersRes.json()
          setMonsters(monstersData.map((m: {
            id: number
            name: string
            hp: number
            max_hp: number
            ac: number
            initiative: number
            notes: string | null
            status: string
            conditions: string[]
            exhaustion_level: number
          }) => ({
            id: `m-${m.id}`,
            name: m.name,
            hp: m.hp,
            maxHp: m.max_hp,
            ac: m.ac,
            initiative: m.initiative,
            notes: m.notes || "",
            status: m.status as "actif" | "mort",
            conditions: m.conditions || [],
            exhaustionLevel: m.exhaustion_level || 0,
          })))
        }

      } catch (error) {
        console.error("Failed to fetch campaign data:", error)
        toast.error("Erreur de connexion", {
          description: "Impossible de charger les données de la campagne"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchCampaignData()
  }, [campaignId])

  // Sync combat state from socket context
  useEffect(() => {
    const { combatState } = socketState
    if (combatState.active !== combatActive) {
      setCombatActive(combatState.active)
    }
    if (combatState.currentTurn !== currentTurn) {
      setCurrentTurn(combatState.currentTurn)
    }
    if (combatState.roundNumber !== roundNumber) {
      setRoundNumber(combatState.roundNumber)
    }
    if (combatState.participants.length > 0) {
      setCombatParticipants(combatState.participants)
    }
  }, [socketState.combatState, combatActive, currentTurn, roundNumber])

  // Sync individual participant updates (HP, conditions, exhaustion) from socket
  // This ensures changes from other clients are reflected immediately
  useEffect(() => {
    const socketParticipants = socketState.combatState.participants
    if (socketParticipants.length === 0 || !combatActive) return

    setCombatParticipants(prev => {
      // Check if any participant has different HP/conditions/exhaustion
      let hasChanges = false
      const updated = prev.map(p => {
        const socketP = socketParticipants.find(sp => sp.id === p.id && sp.type === p.type)
        if (socketP && (
          socketP.currentHp !== p.currentHp ||
          socketP.exhaustionLevel !== p.exhaustionLevel ||
          JSON.stringify(socketP.conditions) !== JSON.stringify(p.conditions) ||
          JSON.stringify(socketP.conditionDurations) !== JSON.stringify(p.conditionDurations) ||
          JSON.stringify(socketP.buffs) !== JSON.stringify(p.buffs)
        )) {
          hasChanges = true
          return {
            ...p,
            currentHp: socketP.currentHp,
            exhaustionLevel: socketP.exhaustionLevel,
            conditions: socketP.conditions,
            conditionDurations: socketP.conditionDurations ?? p.conditionDurations,
            buffs: socketP.buffs ?? p.buffs
          }
        }
        return p
      })
      return hasChanges ? updated : prev
    })
  }, [socketState.combatState.participants, combatActive])

  // Sync ambient effect from socket context
  useEffect(() => {
    if (socketState.ambientEffect !== ambientEffect) {
      setAmbientEffect(socketState.ambientEffect as AmbientEffect)
    }
  }, [socketState.ambientEffect, ambientEffect])

  // Show XP modal for players when DM ends combat
  useEffect(() => {
    if (socketState.xpSummary && mode === 'joueur') {
      setXpSummaryData({
        killedMonsters: socketState.xpSummary.killedMonsters,
        playerCount: socketState.xpSummary.playerCount,
      })
      setShowXpModal(true)
      // Clear the socket state after showing
      socketDispatch({ type: 'CLEAR_XP_SUMMARY' })
    }
  }, [socketState.xpSummary, mode, socketDispatch])

  // Sync inventory updates from socket to local players state
  // This ensures that when another client updates inventory, we reflect it locally
  useEffect(() => {
    // Build a map of character id -> inventory from connected players
    const inventoryUpdates = new Map<string, CharacterInventory>()
    socketState.connectedPlayers.forEach(player => {
      player.characters.forEach(char => {
        if (char.inventory) {
          inventoryUpdates.set(String(char.odNumber), char.inventory)
        }
      })
    })

    // Update local players state if inventories differ
    if (inventoryUpdates.size > 0) {
      setPlayers(prev => {
        let hasChanges = false
        const updated = prev.map(p => {
          const socketInventory = inventoryUpdates.get(p.id)
          if (socketInventory && JSON.stringify(p.inventory) !== JSON.stringify(socketInventory)) {
            hasChanges = true
            return { ...p, inventory: socketInventory }
          }
          return p
        })
        return hasChanges ? updated : prev
      })

      // Also update allCampaignCharacters to keep them in sync
      setAllCampaignCharacters(prev => {
        let hasChanges = false
        const updated = prev.map(p => {
          const socketInventory = inventoryUpdates.get(p.id)
          if (socketInventory && JSON.stringify(p.inventory) !== JSON.stringify(socketInventory)) {
            hasChanges = true
            return { ...p, inventory: socketInventory }
          }
          return p
        })
        return hasChanges ? updated : prev
      })
    }
  }, [socketState.connectedPlayers])

  // Handle DM join success (context sets isJoined when connected-players is received)
  useEffect(() => {
    if (socketState.isJoined && socketState.mode === 'mj' && dmLoading) {
      console.log('[Socket] DM join successful, completing login')
      setMode("mj")
      setSelectedCharacters([])
      setUserSelected(true)
      setDmLoading(false)
      setDmError(null)
      // Persist mode to localStorage
      localStorage.setItem("combatTrackerMode", "mj")
      localStorage.removeItem("combatTrackerCharacters")
      // Store password for auto-rejoin ONLY after successful validation
      if (pendingDmPassword) {
        sessionStorage.setItem('dnd-dm-password', pendingDmPassword)
        setPendingDmPassword(null)
      }
    }
  }, [socketState.isJoined, socketState.mode, dmLoading, pendingDmPassword])

  // Handle join errors from socket context
  useEffect(() => {
    if (socketState.joinError) {
      console.log('[Socket] Join error:', socketState.joinError)
      setDmLoading(false)
      setDmError(socketState.joinError)
      setPendingDmPassword(null) // Clear pending password on error

      // Show toast for player join errors (e.g., character already in use)
      if (mode === 'joueur' || !userSelected) {
        toast.error(socketState.joinError, { duration: 5000 })
        // Clear stored characters so user has to re-select
        localStorage.removeItem('combatTrackerCharacters')
        localStorage.removeItem('combatTrackerMode')
        setUserSelected(false)
        setMode('mj')
      }
    }
  }, [socketState.joinError, mode, userSelected])

  // Auto-join campaign on socket connect if user already selected (page refresh)
  useEffect(() => {
    // Don't auto-join if already joined or if there was a join error (prevents infinite retry loop)
    if (!socketState.isConnected || socketState.isJoined || socketState.joinError) return

    const savedMode = localStorage.getItem('combatTrackerMode')
    if (!savedMode) return

    if (savedMode === 'joueur') {
      const storedCharacters = localStorage.getItem('combatTrackerCharacters')
      if (storedCharacters) {
        const characters = JSON.parse(storedCharacters)
        console.log('[Socket] Auto-joining as player with characters:', characters.map((c: { name: string }) => c.name).join(', '))
        joinCampaign({ role: 'player', characters })
      }
    }
    // Note: DM auto-rejoin is not supported (requires password)
  }, [socketState.isConnected, socketState.isJoined, socketState.joinError, joinCampaign])

  // Build displayPlayers by merging all campaign characters with connected players
  // Connected players get real-time data, disconnected players show from allCampaignCharacters
  const displayPlayers: Character[] = useMemo(() => {
    // Get connected character IDs and their data
    const connectedCharacterIds = new Set<string>()
    const connectedCharactersMap = new Map<string, Character>()

    socketState.connectedPlayers.forEach(player => {
      player.characters.forEach((char, idx) => {
        const id = String(char.odNumber)
        connectedCharacterIds.add(id)
        // Get static data from campaign characters (includes stats from Notion)
        const campaignChar = allCampaignCharacters.find(c => c.id === id)
        // Check combat participants for combat-specific state (they persist in Redis)
        const combatParticipant = socketState.combatState.participants.find(
          p => p.id === id && p.type === 'player'
        )
        // For connected players, socket state is source of truth for HP, conditions, exhaustion
        // Combat participant takes priority during combat, otherwise use char (from connectedPlayers)
        connectedCharactersMap.set(id, {
          id,
          name: char.name,
          class: char.class,
          level: char.level,
          // HP: combat participant during combat, otherwise from connectedPlayers socket state
          currentHp: combatParticipant?.currentHp ?? char.currentHp,
          maxHp: char.maxHp,
          // Temp HP: combat participant during combat, otherwise from connectedPlayers socket state
          tempHp: combatParticipant?.tempHp ?? char.tempHp,
          ac: char.ac,
          // Use initiative override if set, otherwise use character's initiative
          initiative: playerInitiatives[id] ?? char.initiative,
          // Conditions: combat participant during combat, otherwise from connectedPlayers socket state
          conditions: combatParticipant?.conditions ?? char.conditions ?? [],
          // Condition durations: combat participant during combat, otherwise from socket connected player data
          conditionDurations: combatParticipant?.conditionDurations ?? char.conditionDurations ?? {},
          // Exhaustion: combat participant during combat, otherwise from connectedPlayers socket state
          exhaustionLevel: combatParticipant?.exhaustionLevel ?? char.exhaustionLevel ?? 0,
          // Buffs: combat participant during combat, otherwise from socket connected player data
          buffs: combatParticipant?.buffs ?? char.buffs ?? [],
          inventory: char.inventory || DEFAULT_INVENTORY,
          isConnected: true,
          playerSocketId: player.socketId,
          isFirstInGroup: idx === 0,
          groupSize: player.characters.length,
          // Include stats from Notion (campaign characters)
          passivePerception: campaignChar?.passivePerception,
          strength: campaignChar?.strength,
          dexterity: campaignChar?.dexterity,
          constitution: campaignChar?.constitution,
          intelligence: campaignChar?.intelligence,
          wisdom: campaignChar?.wisdom,
          charisma: campaignChar?.charisma,
          savingThrowProficiencies: campaignChar?.savingThrowProficiencies,
          // Spell slots from campaign characters (Notion) and socket state
          maxSpellSlots: campaignChar?.maxSpellSlots,
          spellSlots: char.spellSlots ?? campaignChar?.spellSlots ?? campaignChar?.maxSpellSlots,
          isWarlock: campaignChar?.isWarlock,
        })
      })
    })

    // Merge with all campaign characters
    const allPlayers: Character[] = allCampaignCharacters.map(char => {
      // If connected, use real-time data from socket (source of truth)
      if (connectedCharacterIds.has(char.id)) {
        const connectedChar = connectedCharactersMap.get(char.id)!
        // Merge with local player state for inventory only (HP comes from socket)
        const localPlayer = players.find(p => p.id === char.id)
        return {
          ...connectedChar,
          // HP from socket is source of truth for connected players (synced via hp-change events)
          currentHp: connectedChar.currentHp,
          // Temp HP from socket is source of truth for connected players
          tempHp: connectedChar.tempHp ?? localPlayer?.tempHp,
          // CRITICAL: Use local inventory if player is in local state (it has the latest changes)
          inventory: localPlayer ? localPlayer.inventory : connectedChar.inventory,
          // Socket state (connectedChar) is source of truth for conditions - it's updated via condition-change events
          conditionDurations: connectedChar.conditionDurations ?? localPlayer?.conditionDurations ?? char.conditionDurations ?? {},
          // Socket state (connectedChar) is source of truth for buffs - it's updated via buff-change events
          // localPlayer.buffs is only updated on DM side, not player side
          buffs: connectedChar.buffs ?? localPlayer?.buffs ?? char.buffs ?? [],
          // Spell slots: socket state (connectedChar) is source of truth - it's updated via spell-slot-change events
          spellSlots: connectedChar.spellSlots ?? localPlayer?.spellSlots ?? char.spellSlots ?? char.maxSpellSlots,
        }
      }
      // Otherwise, use static data with isConnected: false
      // Check combat participants for state (they persist in Redis across refresh)
      const combatParticipant = socketState.combatState.participants.find(
        p => p.id === char.id && p.type === 'player'
      )
      // For disconnected players, combat participant is source of truth during combat
      // Fall back to campaign character data (char) from initial load
      const localPlayer = players.find(p => p.id === char.id)

      return {
        ...char,
        isConnected: false,
        initiative: playerInitiatives[char.id] ?? char.initiative,
        // Combat participant is source of truth during combat
        currentHp: combatParticipant?.currentHp ?? localPlayer?.currentHp ?? char.currentHp,
        // Temp HP from combat participant during combat, otherwise from local state
        tempHp: combatParticipant?.tempHp ?? localPlayer?.tempHp ?? char.tempHp,
        conditions: combatParticipant?.conditions ?? char.conditions ?? [],
        conditionDurations: combatParticipant?.conditionDurations ?? localPlayer?.conditionDurations ?? char.conditionDurations ?? {},
        exhaustionLevel: combatParticipant?.exhaustionLevel ?? char.exhaustionLevel ?? 0,
        buffs: combatParticipant?.buffs ?? localPlayer?.buffs ?? char.buffs ?? [],
        inventory: localPlayer?.inventory || char.inventory,
        // Spell slots from local player state or campaign character (Notion)
        maxSpellSlots: char.maxSpellSlots,
        spellSlots: localPlayer?.spellSlots ?? char.spellSlots ?? char.maxSpellSlots,
        isWarlock: char.isWarlock,
      }
    })

    // Sort: connected first, then by name
    return allPlayers.sort((a, b) => {
      if (a.isConnected && !b.isConnected) return -1
      if (!a.isConnected && b.isConnected) return 1
      return a.name.localeCompare(b.name)
    })
  }, [socketState.connectedPlayers, allCampaignCharacters, socketState.combatState.participants, playerInitiatives, players])

  // Memoize connected player IDs to avoid infinite loops
  const connectedPlayerIds = useMemo(() => {
    return new Set(displayPlayers.filter(p => p.isConnected).map(p => p.id))
  }, [displayPlayers])

  // Build AI combat context for the assistant panel
  const aiCombatContext: CombatContext = useMemo(() => ({
    isActive: combatActive,
    round: roundNumber,
    currentTurn,
    participants: combatParticipants.map((p, idx) => ({
      name: p.name,
      type: p.type,
      currentHp: p.currentHp,
      maxHp: p.maxHp,
      ac: p.ac,
      conditions: p.conditions || [],
      isCurrentTurn: idx === currentTurn,
    })),
  }), [combatActive, roundNumber, currentTurn, combatParticipants])

  // Sync combat participants' isConnected status and level with displayPlayers
  useEffect(() => {
    if (combatParticipants.length === 0) return

    // Create a map of player data for quick lookup
    const playerDataMap = new Map(displayPlayers.map(p => [p.id, p]))

    setCombatParticipants(prev => {
      let hasChanges = false
      const updated = prev.map(participant => {
        if (participant.type === 'player') {
          const playerData = playerDataMap.get(participant.id)
          const shouldBeConnected = connectedPlayerIds.has(participant.id)
          const shouldLevel = playerData?.level ?? participant.level

          if (participant.isConnected !== shouldBeConnected || participant.level !== shouldLevel) {
            hasChanges = true
            return { ...participant, isConnected: shouldBeConnected, level: shouldLevel }
          }
        }
        return participant
      })
      return hasChanges ? updated : prev
    })
  }, [connectedPlayerIds, combatParticipants.length, displayPlayers])

  // Helper to add history entry
  const addHistoryEntry = (entry: Omit<HistoryEntry, "id" | "timestamp">) => {
    setCombatHistory(prev => [...prev, {
      ...entry,
      id: `h-${Date.now()}`,
      timestamp: new Date(),
    }])
  }

  const startCombat = () => {
    // If participants were pre-added via drag-drop, use those (keeping their order)
    // Otherwise, fall back to adding all players and monsters
    let participantsToUse = combatParticipants

    if (combatParticipants.length === 0) {
      participantsToUse = [
        ...displayPlayers.map((p) => ({
          ...p,
          type: "player" as const,
          conditions: p.conditions || [],
          conditionDurations: p.conditionDurations || {},
          exhaustionLevel: p.exhaustionLevel || 0,
          buffs: p.buffs || [],
        })),
        ...monsters.map((m) => ({
          id: m.id,
          name: m.name,
          initiative: m.initiative,
          currentHp: m.hp,
          maxHp: m.maxHp,
          ac: m.ac,
          conditions: m.conditions || [],
          conditionDurations: m.conditionDurations || {},
          exhaustionLevel: m.exhaustionLevel || 0,
          buffs: m.buffs || [],
          type: "monster" as const,
        })),
      ].sort((a, b) => b.initiative - a.initiative)
      setCombatParticipants(participantsToUse)
    }

    setCombatActive(true)
    setCurrentTurn(0)
    setRoundNumber(1)
    addHistoryEntry({ type: "combat_start" })

    // Emit socket event to sync with players
    emitCombatUpdate({
      type: 'start',
      combatActive: true,
      currentTurn: 0,
      roundNumber: 1,
      participants: participantsToUse,
    })

    toast.success("Combat commencé!", {
      description: `${participantsToUse.length} participants`
    })
  }

  // Show XP summary modal before ending combat
  const stopCombat = () => {
    // Calculate XP from all monsters that are dead (HP = 0), excluding pets
    const deadMonsters = combatParticipants
      .filter(p => p.type === "monster" && p.currentHp <= 0 && !p.isPet)
      .map(p => ({ name: p.name, xp: p.xp || 0 }))

    const playerCount = combatParticipants.filter(p => p.type === "player").length

    // Calculate total XP for socket event
    const totalXp = deadMonsters.reduce((sum, m) => sum + m.xp, 0)
    const perPlayerXp = playerCount > 0 ? Math.floor(totalXp / playerCount) : totalXp

    // Emit socket event with XP summary so players see the modal too
    emitCombatUpdate({
      type: 'combat_end_xp',
      xpSummary: {
        totalXp,
        perPlayerXp,
        playerCount,
        killedMonsters: deadMonsters,
      },
    })

    // Show XP modal (players receive via socket)
    setXpSummaryData({ killedMonsters: deadMonsters, playerCount })
    setShowXpModal(true)
  }

  // Called when XP modal is closed - actually ends combat
  const confirmEndCombat = () => {
    setShowXpModal(false)

    // Only DM needs to do the full cleanup and emit socket events
    // Players just close the modal - their state is synced via socket from DM
    if (mode === "mj") {
      addHistoryEntry({ type: "combat_end" })
      setCombatActive(false)
      setCombatParticipants([])
      setCurrentTurn(0)
      setRoundNumber(1)
      setCombatHistory([])

      // Emit socket event to fully stop combat
      emitCombatUpdate({
        type: 'stop',
        combatActive: false,
        currentTurn: 0,
        roundNumber: 1,
      })

      toast("Combat terminé")
    }
  }

  const clearCombat = () => {
    setCombatParticipants([])
    if (combatActive) {
      setCombatActive(false)
      setCurrentTurn(0)
      setRoundNumber(1)
      setCombatHistory([])

      // Emit socket event to sync with players
      emitCombatUpdate({
        type: 'stop',
        combatActive: false,
        currentTurn: 0,
        roundNumber: 1,
      })
    }

    toast("Combat vidé")
  }

  const nextTurn = () => {
    // Helper to check if a participant should be skipped (dead, dying, or stabilized)
    const shouldSkip = (p: typeof combatParticipants[0]) => {
      if (!p) return false
      // Skip dead participants (monsters with HP <= 0, or anyone marked as dead)
      if (p.isDead) return true
      // Skip participants with 0 HP (dead monsters, dying players)
      if (p.currentHp <= 0) return true
      // Skip stabilized players (unconscious but stable)
      if (p.isStabilized) return true
      return false
    }

    // Find the next active participant
    let nextIndex = (currentTurn + 1) % combatParticipants.length
    let stepsChecked = 0
    let passedZero = nextIndex === 0 // Track if we've wrapped around to index 0

    while (shouldSkip(combatParticipants[nextIndex]) && stepsChecked < combatParticipants.length) {
      nextIndex = (nextIndex + 1) % combatParticipants.length
      if (nextIndex === 0) passedZero = true
      stepsChecked++
    }

    // If all participants are incapacitated, don't advance
    if (stepsChecked >= combatParticipants.length) {
      toast.error("Aucun participant actif !")
      return
    }

    // Increment round when we've passed through index 0 (wrapped around)
    const newRound = passedZero ? roundNumber + 1 : roundNumber

    // Process condition durations for the NEXT participant (at the START of their turn)
    // "1 round" means the condition lasts until the start of their next turn
    const nextParticipant = combatParticipants[nextIndex]
    if (nextParticipant?.conditionDurations) {
      const expiredConditions: string[] = []
      const newDurations: Record<string, number> = {}

      for (const [conditionId, duration] of Object.entries(nextParticipant.conditionDurations)) {
        const newDuration = duration - 1
        if (newDuration <= 0) {
          expiredConditions.push(conditionId)
        } else {
          newDurations[conditionId] = newDuration
        }
      }

      if (expiredConditions.length > 0 || Object.keys(newDurations).length !== Object.keys(nextParticipant.conditionDurations).length) {
        // Remove expired conditions
        const newConditions = nextParticipant.conditions.filter(c => !expiredConditions.includes(c))
        const updatedDurations = Object.keys(newDurations).length > 0 ? newDurations : undefined

        setCombatParticipants(prev =>
          prev.map(p => p.id === nextParticipant.id ? { ...p, conditions: newConditions, conditionDurations: updatedDurations } : p)
        )

        // Emit condition change for expired conditions
        emitConditionChange({
          participantId: nextParticipant.id,
          participantType: nextParticipant.type,
          conditions: newConditions,
          conditionDurations: updatedDurations,
        })

        // Persist to database for players
        if (nextParticipant.type === 'player') {
          fetch(`/api/characters/${nextParticipant.id}/hp`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conditions: newConditions, conditionDurations: updatedDurations }),
          }).catch(err => console.error('Failed to persist condition durations:', err))
        }

        // Notify about expired conditions
        if (expiredConditions.length > 0) {
          toast(`${nextParticipant.name}: condition expirée`, { duration: 2000 })
        }
      } else if (Object.keys(newDurations).length > 0) {
        // Just update durations without removing conditions
        setCombatParticipants(prev =>
          prev.map(p => p.id === nextParticipant.id ? { ...p, conditionDurations: newDurations } : p)
        )

        // Emit updated durations
        emitConditionChange({
          participantId: nextParticipant.id,
          participantType: nextParticipant.type,
          conditions: nextParticipant.conditions,
          conditionDurations: newDurations,
        })

        // Persist to database for players
        if (nextParticipant.type === 'player') {
          fetch(`/api/characters/${nextParticipant.id}/hp`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conditionDurations: newDurations }),
          }).catch(err => console.error('Failed to persist condition durations:', err))
        }
      }
    }

    // Process buff/debuff durations for the NEXT participant (at the START of their turn)
    if (nextParticipant?.buffs && nextParticipant.buffs.length > 0) {
      const expiredBuffs: string[] = []
      const updatedBuffs: ActiveBuff[] = []

      for (const buff of nextParticipant.buffs) {
        if (buff.remainingTurns === null) {
          // Permanent/concentration-based buff - keep as is
          updatedBuffs.push(buff)
        } else if (buff.remainingTurns > 1) {
          // Decrement duration
          updatedBuffs.push({ ...buff, remainingTurns: buff.remainingTurns - 1 })
        } else {
          // Duration expired (remainingTurns <= 1)
          expiredBuffs.push(buff.buffId)
        }
      }

      // Only update if there were changes
      if (expiredBuffs.length > 0 || updatedBuffs.some((b, i) => b.remainingTurns !== nextParticipant.buffs![i].remainingTurns)) {
        setCombatParticipants(prev =>
          prev.map(p => p.id === nextParticipant.id ? { ...p, buffs: updatedBuffs } : p)
        )

        // Update local players/monsters state too
        if (nextParticipant.type === 'player') {
          setPlayers(prev => prev.map(p => p.id === nextParticipant.id ? { ...p, buffs: updatedBuffs } : p))
        } else {
          setMonsters(prev => prev.map(m => m.id === nextParticipant.id ? { ...m, buffs: updatedBuffs } : m))
        }

        // Emit buff change
        emitBuffChange({
          participantId: nextParticipant.id,
          participantType: nextParticipant.type,
          buffs: updatedBuffs,
        })

        // Persist to database for players
        if (nextParticipant.type === 'player') {
          fetch(`/api/characters/${nextParticipant.id}/hp`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ buffs: updatedBuffs }),
          }).catch(err => console.error('Failed to persist buff duration update:', err))
        }

        // Notify about expired buffs
        if (expiredBuffs.length > 0) {
          toast(`${nextParticipant.name}: effet expiré`, { duration: 2000 })
        }
      }
    }

    setCurrentTurn(nextIndex)
    if (passedZero) {
      setRoundNumber(newRound)
    }

    // Emit socket event to sync with players
    emitCombatUpdate({
      type: 'next-turn',
      combatActive: true,
      currentTurn: nextIndex,
      roundNumber: newRound,
    })

    if (nextParticipant) {
      addHistoryEntry({ type: "turn", target: nextParticipant.name })
      if (passedZero) {
        toast.success(`Round ${newRound} - Tour de ${nextParticipant.name}`, {
          duration: 3000
        })
      } else {
        toast(`Tour de ${nextParticipant.name}`, {
          duration: 2000
        })
      }
    }
  }

  const updatePlayerHp = async (id: string, change: number, skipConcentrationCheck = false) => {
    // Look in displayPlayers which has the merged data from socket and campaign
    const player = displayPlayers.find(p => p.id === id)
    if (!player) return

    // Check for concentration when taking damage (DM only, during combat)
    if (mode === 'mj' && combatActive && change < 0 && !skipConcentrationCheck) {
      const isConcentrated = player.conditions?.includes("concentre")
      if (isConcentrated) {
        const damage = Math.abs(change)
        const dc = Math.min(30, Math.max(10, Math.floor(damage / 2)))
        setConcentrationCheck({
          participantId: id,
          participantName: player.name,
          participantType: 'player',
          damage,
          dc,
          pendingChange: change,
        })
        return // Wait for concentration check result
      }
    }

    // Player mode: notify DM if taking damage while concentrating
    if (mode === 'joueur' && combatActive && change < 0 && !skipConcentrationCheck) {
      const isConcentrated = player.conditions?.includes("concentre")
      if (isConcentrated && socketState.socket) {
        const damage = Math.abs(change)
        const dc = Math.min(30, Math.max(10, Math.floor(damage / 2)))
        // Notify DM to handle concentration check (damage will still be applied below)
        socketState.socket.emit('concentration-check-request', {
          participantId: id,
          participantName: player.name,
          participantType: 'player' as const,
          damage,
          dc,
        })
      }
    }

    // Handle temp HP absorption for damage (D&D 5e rules)
    let actualHpChange = change
    let newTempHp = player.tempHp ?? 0

    if (change < 0 && newTempHp > 0) {
      // Damage is dealt and player has temp HP
      const damage = Math.abs(change)
      if (damage <= newTempHp) {
        // Temp HP absorbs all damage
        newTempHp -= damage
        actualHpChange = 0 // No damage to regular HP
      } else {
        // Temp HP absorbs part of damage, rest goes to regular HP
        actualHpChange = -(damage - newTempHp) // Remaining damage as negative
        newTempHp = 0 // Temp HP depleted
      }
    }

    // Remove temp HP completely when it reaches 0
    // Use 0 instead of undefined so it serializes over socket and clears temp HP
    const finalTempHp = newTempHp > 0 ? newTempHp : 0

    const newHp = Math.max(0, Math.min(player.maxHp, player.currentHp + actualHpChange))
    const wasAtZeroHp = player.currentHp === 0

    // Add history entry for damage/heal
    if (combatActive && change !== 0) {
      if (change < 0) {
        addHistoryEntry({ type: "damage", target: player.name, value: Math.abs(change) })
        if (newHp === 0) {
          addHistoryEntry({ type: "death", target: player.name })
        }
      } else {
        addHistoryEntry({ type: "heal", target: player.name, value: change })
      }
    }

    // Update locally first for immediate feedback
    // For local state, use undefined when tempHp is 0 (cleaner display)
    const localTempHp = finalTempHp > 0 ? finalTempHp : undefined
    setPlayers((prev) => {
      const exists = prev.some(p => p.id === id)
      if (exists) {
        return prev.map((p) => (p.id === id ? { ...p, currentHp: newHp, tempHp: localTempHp } : p))
      } else {
        // Add player to state with updated HP (player was not in local state yet)
        return [...prev, { ...player, currentHp: newHp, tempHp: localTempHp }]
      }
    })

    // Always emit HP change to sync with other clients (including socket state)
    emitHpChange({
      participantId: id,
      participantType: 'player',
      newHp,
      tempHp: finalTempHp,
      change,
      source: mode === 'mj' ? 'dm' : 'player',
    })

    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, currentHp: newHp, tempHp: localTempHp } : p)),
      )

      // Reset death saves when healed from 0 HP
      if (wasAtZeroHp && newHp > 0) {
        updateDeathSaves(id, 'player', { successes: 0, failures: 0 }, false, false)
      }
    }

    // Persist HP and temp HP to database for session persistence
    try {
      await fetch(`/api/characters/${id}/hp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentHp: newHp, tempHp: finalTempHp ?? 0 }),
      })
    } catch (error) {
      console.error('Failed to persist HP:', error)
    }
  }

  // Set temp HP for a player (D&D 5e: replaces existing temp HP, cannot stack)
  const updatePlayerTempHp = async (id: string, newTempHp: number) => {
    const player = displayPlayers.find(p => p.id === id)
    if (!player) return

    // Temp HP cannot be negative
    const finalTempHp = Math.max(0, newTempHp) || undefined

    // Update locally
    setPlayers((prev) => {
      const exists = prev.some(p => p.id === id)
      if (exists) {
        return prev.map((p) => (p.id === id ? { ...p, tempHp: finalTempHp } : p))
      } else {
        return [...prev, { ...player, tempHp: finalTempHp }]
      }
    })

    // Emit to sync with other clients
    emitHpChange({
      participantId: id,
      participantType: 'player',
      newHp: player.currentHp,
      tempHp: finalTempHp,
      change: 0,
      source: 'dm',
    })

    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, tempHp: finalTempHp } : p)),
      )
    }

    // Persist to database
    try {
      await fetch(`/api/characters/${id}/hp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempHp: finalTempHp ?? 0 }),
      })
    } catch (error) {
      console.error('Failed to persist temp HP:', error)
    }
  }

  const updateMonsterTempHp = async (id: string, newTempHp: number) => {
    const monster = monsters.find(m => m.id === id)
    const participant = combatParticipants.find(p => p.id === id && p.type === 'monster')
    if (!monster && !participant) return

    // Temp HP cannot be negative
    const finalTempHp = Math.max(0, newTempHp) || undefined
    const currentHp = monster?.hp ?? participant?.currentHp ?? 0

    // Update local monsters state
    setMonsters((prev) =>
      prev.map((m) => (m.id === id ? { ...m, tempHp: finalTempHp } : m))
    )

    // Update combat participants if in combat
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, tempHp: finalTempHp } : p))
      )
    }

    // Emit to sync with other clients
    emitHpChange({
      participantId: id,
      participantType: 'monster',
      newHp: currentHp,
      tempHp: finalTempHp,
      change: 0,
      source: 'dm',
    })
  }

  const updateMonsterHp = async (id: string, change: number, skipConcentrationCheck = false) => {
    // Try to find in monsters array first, then fall back to combat participants
    const monster = monsters.find(m => m.id === id)
    const participant = combatParticipants.find(p => p.id === id && p.type === 'monster')

    // Need either monster or participant to update
    if (!monster && !participant) return

    const currentHp = monster?.hp ?? participant?.currentHp ?? 0
    const maxHp = monster?.maxHp ?? participant?.maxHp ?? currentHp
    const name = monster?.name ?? participant?.name ?? 'Monster'
    const conditions = monster?.conditions ?? participant?.conditions ?? []
    const currentTempHp = monster?.tempHp ?? participant?.tempHp ?? 0

    // Check for concentration when taking damage (DM only, during combat)
    if (mode === 'mj' && combatActive && change < 0 && !skipConcentrationCheck) {
      const isConcentrated = conditions.includes("concentre")
      if (isConcentrated) {
        const damage = Math.abs(change)
        const dc = Math.min(30, Math.max(10, Math.floor(damage / 2)))
        setConcentrationCheck({
          participantId: id,
          participantName: name,
          participantType: 'monster',
          damage,
          dc,
          pendingChange: change,
        })
        return // Wait for concentration check result
      }
    }

    // Handle temp HP absorption for damage (D&D 5e rules)
    let actualHpChange = change
    let newTempHp = currentTempHp

    console.log('[DEBUG Monster HP] Input:', { id, name, currentHp, maxHp, currentTempHp, change })

    if (change < 0 && newTempHp > 0) {
      // Damage is dealt and monster has temp HP
      const damage = Math.abs(change)
      console.log('[DEBUG Monster HP] Damage with tempHP:', { damage, tempHpBefore: newTempHp })
      if (damage <= newTempHp) {
        // Temp HP absorbs all damage
        newTempHp -= damage
        actualHpChange = 0 // No damage to regular HP
      } else {
        // Temp HP absorbs part of damage, rest goes to regular HP
        actualHpChange = -(damage - newTempHp) // Remaining damage as negative
        newTempHp = 0 // Temp HP depleted
      }
      console.log('[DEBUG Monster HP] After absorption:', { newTempHp, actualHpChange })
    }

    // Use 0 instead of undefined so it serializes over socket and clears temp HP
    const finalTempHp = newTempHp > 0 ? newTempHp : 0
    const newHp = Math.max(0, Math.min(maxHp, currentHp + actualHpChange))
    console.log('[DEBUG Monster HP] Final:', { newHp, finalTempHp })

    // Add history entry for damage/heal
    if (combatActive && change !== 0) {
      if (change < 0) {
        addHistoryEntry({ type: "damage", target: name, value: Math.abs(change) })
        if (newHp === 0) {
          addHistoryEntry({ type: "death", target: name })
        }
      } else {
        addHistoryEntry({ type: "heal", target: name, value: change })
      }
    }

    // For local state, use undefined when tempHp is 0 (cleaner display)
    const localTempHp = finalTempHp > 0 ? finalTempHp : undefined

    // Update monsters array if monster exists there
    if (monster) {
      setMonsters((prev) =>
        prev.map((m) => (m.id === id ? { ...m, hp: newHp, tempHp: localTempHp } : m)),
      )
    }

    // Always update combat participants during combat
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, currentHp: newHp, tempHp: localTempHp } : p)),
      )

      // Emit HP change to sync with other clients
      emitHpChange({
        participantId: id,
        participantType: 'monster',
        newHp,
        tempHp: finalTempHp,
        change,
        source: mode === 'mj' ? 'dm' : 'player',
      })
    }

    // Update in database only for persisted monsters (m-* IDs)
    if (monster && id.startsWith('m-')) {
      try {
        await fetch(`/api/campaigns/${campaignId}/combat-monsters`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ monsterId: getNumericId(id), hp: newHp }),
        })
      } catch (error) {
        console.error('Failed to update monster HP:', error)
        toast.error("Erreur de sauvegarde")
      }
    }
  }

  const updatePlayerInitiative = async (id: string, initiative: number) => {
    // Store initiative override (session-only, not persisted)
    setPlayerInitiatives(prev => ({ ...prev, [id]: initiative }))
  }

  const updatePlayerConditions = async (id: string, conditions: string[], conditionDurations?: Record<string, number>) => {
    console.log('[updatePlayerConditions] id:', id, 'conditions:', conditions, 'conditionDurations:', conditionDurations)
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, conditions } : p)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, conditions, conditionDurations } : p))
      )
    }

    // Emit condition change to sync with other clients (even outside combat)
    emitConditionChange({
      participantId: id,
      participantType: 'player',
      conditions,
      conditionDurations,
    })

    // Persist conditions and conditionDurations to database
    try {
      await fetch(`/api/characters/${id}/hp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions, conditionDurations }),
      })
      console.log('[Conditions] Persisted to database:', id, conditions, conditionDurations)
    } catch (error) {
      console.error('Failed to persist conditions:', error)
    }
  }

  const updatePlayerExhaustion = async (id: string, exhaustionLevel: number) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, exhaustionLevel } : p)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, exhaustionLevel } : p))
      )
    }

    // Emit exhaustion change to sync with other clients (even outside combat)
    emitExhaustionChange({
      participantId: id,
      participantType: 'player',
      exhaustionLevel,
    })

    // Persist exhaustion to database
    try {
      await fetch(`/api/characters/${id}/hp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exhaustionLevel }),
      })
      console.log('[Exhaustion] Persisted to database:', id, exhaustionLevel)
    } catch (error) {
      console.error('Failed to persist exhaustion:', error)
    }
  }

  const updatePlayerInventory = async (id: string, inventory: CharacterInventory) => {
    console.log('[Inventory] Updating inventory for character:', id, inventory)

    // Update local state - ensure character exists in players state
    setPlayers((prev) => {
      const existingPlayer = prev.find(p => p.id === id)
      if (existingPlayer) {
        // Update existing player
        return prev.map((p) => (p.id === id ? { ...p, inventory } : p))
      } else {
        // Player not in state yet (connected via WebSocket) - find from displayPlayers and add
        const connectedPlayer = displayPlayers.find(p => p.id === id)
        if (connectedPlayer) {
          console.log('[Inventory] Adding connected player to local state:', connectedPlayer.name)
          return [...prev, { ...connectedPlayer, inventory: inventory || DEFAULT_INVENTORY }]
        }
        // Player not found anywhere - this shouldn't happen, but handle it gracefully
        console.warn('[Inventory] Player not found in displayPlayers:', id)
        return prev
      }
    })

    // Update combat participants if active
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, inventory } : p))
      )
    }

    // Emit socket event
    emitInventoryUpdate({
      participantId: id,
      participantType: 'player',
      inventory,
      source: mode === 'mj' ? 'dm' : 'player',
    })

    // Persist to localStorage for player's own characters
    if (mode === 'joueur' && selectedCharacters.some(sc => String(sc.id) === id)) {
      const storedCharacters = localStorage.getItem('combatTrackerCharacters')
      if (storedCharacters) {
        try {
          const characters = JSON.parse(storedCharacters)
          const updatedCharacters = characters.map((char: any) =>
            String(char.odNumber) === id ? { ...char, inventory } : char
          )
          localStorage.setItem('combatTrackerCharacters', JSON.stringify(updatedCharacters))
        } catch (error) {
          console.error('Failed to persist inventory to localStorage:', error)
        }
      }
    }

    // Persist to database
    console.log('[Inventory] Persisting to database:', `/api/characters/${id}/inventory`)
    try {
      const response = await fetch(`/api/characters/${id}/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inventory),
      })
      if (response.ok) {
        const saved = await response.json()
        console.log('[Inventory] Successfully saved to database:', saved)
      } else {
        console.error('[Inventory] Failed to save - HTTP', response.status, await response.text())
      }
    } catch (error) {
      console.error('Failed to persist inventory to database:', error)
    }
  }

  // Spell slot handlers
  const updatePlayerSpellSlot = async (characterId: string, level: number, delta: number) => {
    // Find player and get current slots
    const player = displayPlayers.find(p => p.id === characterId)
    if (!player) return

    const currentSlots = player.spellSlots || {}
    const maxSlots = player.maxSpellSlots || {}
    const current = currentSlots[level] || 0
    const max = maxSlots[level] || 0

    // Calculate new value (bounded by 0 and max)
    const newValue = Math.max(0, Math.min(max, current + delta))
    const newSlots = { ...currentSlots, [level]: newValue }

    // Update local state
    setPlayers((prev) => prev.map((p) =>
      p.id === characterId ? { ...p, spellSlots: newSlots } : p
    ))

    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === characterId ? { ...p, spellSlots: newSlots } : p))
      )
    }

    // Emit socket event
    emitSpellSlotChange({
      participantId: characterId,
      participantType: 'player',
      spellSlots: newSlots,
      source: mode === 'mj' ? 'dm' : 'player',
    })

    // Persist to database
    try {
      await fetch(`/api/characters/${characterId}/hp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spellSlots: newSlots }),
      })
      console.log('[SpellSlots] Persisted to database:', characterId, newSlots)
    } catch (error) {
      console.error('Failed to persist spell slots:', error)
    }
  }

  const handleShortRest = async (characterId: string) => {
    // Only warlocks recover on short rest
    const player = displayPlayers.find(p => p.id === characterId)
    if (!player?.isWarlock) return

    const maxSlots = player.maxSpellSlots || {}
    const newSlots = { ...maxSlots }

    // Update local state
    setPlayers((prev) => prev.map((p) =>
      p.id === characterId ? { ...p, spellSlots: newSlots } : p
    ))

    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === characterId ? { ...p, spellSlots: newSlots } : p))
      )
    }

    // Emit socket event
    emitSpellSlotChange({
      participantId: characterId,
      participantType: 'player',
      spellSlots: newSlots,
      source: mode === 'mj' ? 'dm' : 'player',
    })

    // Persist to database
    try {
      await fetch(`/api/characters/${characterId}/hp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spellSlots: newSlots }),
      })
      console.log('[SpellSlots] Short rest - restored all slots for warlock:', characterId)
      toast.success(`${player.name} récupère ses emplacements (repos court)`)
    } catch (error) {
      console.error('Failed to persist spell slots:', error)
    }
  }

  const handleLongRest = async (characterId: string) => {
    const player = displayPlayers.find(p => p.id === characterId)
    if (!player) return

    const maxSlots = player.maxSpellSlots || {}
    const newSlots = { ...maxSlots }

    // Update local state
    setPlayers((prev) => prev.map((p) =>
      p.id === characterId ? { ...p, spellSlots: newSlots } : p
    ))

    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === characterId ? { ...p, spellSlots: newSlots } : p))
      )
    }

    // Emit socket event
    emitSpellSlotChange({
      participantId: characterId,
      participantType: 'player',
      spellSlots: newSlots,
      source: mode === 'mj' ? 'dm' : 'player',
    })

    // Persist to database
    try {
      await fetch(`/api/characters/${characterId}/hp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spellSlots: newSlots }),
      })
      console.log('[SpellSlots] Long rest - restored all slots:', characterId)
      toast.success(`${player.name} récupère ses emplacements (repos long)`)
    } catch (error) {
      console.error('Failed to persist spell slots:', error)
    }
  }

  const updateMonsterConditions = async (id: string, conditions: string[], conditionDurations?: Record<string, number>) => {
    setMonsters((prev) => prev.map((m) => (m.id === id ? { ...m, conditions } : m)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, conditions, conditionDurations } : p))
      )

      // Emit condition change to sync with other clients
      emitConditionChange({
        participantId: id,
        participantType: 'monster',
        conditions,
        conditionDurations,
      })
    }

    // Update in database
    try {
      await fetch(`/api/campaigns/${campaignId}/combat-monsters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterId: getNumericId(id), conditions }),
      })
    } catch (error) {
      console.error('Failed to update monster conditions:', error)
      toast.error("Erreur de sauvegarde")
    }
  }

  // Handle concentration check result (passed or failed)
  const handleConcentrationResult = async (passed: boolean) => {
    if (!concentrationCheck) return

    const { participantId, participantName, participantType, pendingChange, dc } = concentrationCheck

    // Apply the pending damage with skipConcentrationCheck flag
    // Skip if pendingChange is 0 (player already applied their own damage)
    if (pendingChange !== 0) {
      if (participantType === 'player') {
        await updatePlayerHp(participantId, pendingChange, true)
      } else {
        await updateMonsterHp(participantId, pendingChange, true)
      }
    }

    // If concentration check failed, remove the "concentre" condition
    if (!passed) {
      if (participantType === 'player') {
        const player = displayPlayers.find(p => p.id === participantId)
        if (player) {
          const newConditions = (player.conditions || []).filter(c => c !== 'concentre')
          await updatePlayerConditions(participantId, newConditions)
        }
      } else {
        const monster = monsters.find(m => m.id === participantId)
        const participant = combatParticipants.find(p => p.id === participantId)
        const currentConditions = monster?.conditions ?? participant?.conditions ?? []
        const newConditions = currentConditions.filter(c => c !== 'concentre')
        await updateMonsterConditions(participantId, newConditions)
      }

      // Add history entry for broken concentration
      addHistoryEntry({
        type: "condition_remove",
        target: participantName,
        condition: "Concentration brisée (DD " + dc + ")",
      })

      // Broadcast the concentration broken effect to all players
      emitAmbientEffect({ effect: 'concentration-broken' })

      toast.error(`${participantName} perd sa concentration !`)
    } else {
      toast.success(`${participantName} maintient sa concentration !`)
    }

    // Clear the concentration check state
    setConcentrationCheck(null)
  }

  // Handle concentration check cancel (apply damage but skip the check)
  const handleConcentrationCancel = async () => {
    if (!concentrationCheck) return

    const { participantId, participantType, pendingChange } = concentrationCheck

    // Apply the pending damage with skipConcentrationCheck flag
    // Skip if pendingChange is 0 (player already applied their own damage)
    if (pendingChange !== 0) {
      if (participantType === 'player') {
        await updatePlayerHp(participantId, pendingChange, true)
      } else {
        await updateMonsterHp(participantId, pendingChange, true)
      }
    }

    // Clear the concentration check state
    setConcentrationCheck(null)
  }

  // Session notes handlers - using Redis API
  const fetchSessionNotes = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-notes`)
      if (response.ok) {
        const data = await response.json()
        setSessionNotes(data.notes || [])
      }
    } catch (error) {
      console.error('Error fetching session notes:', error)
    }
  }

  const handleAddNote = async (note: Omit<Note, "id" | "time">) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: note.title, content: note.content }),
      })
      if (response.ok) {
        const data = await response.json()
        setSessionNotes(data.notes)
        toast.success("Note créée")
      }
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error("Erreur lors de la création de la note")
    }
  }

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId: id, ...updates }),
      })
      if (response.ok) {
        const data = await response.json()
        setSessionNotes(data.notes)
      }
    } catch (error) {
      console.error('Error updating note:', error)
      toast.error("Erreur lors de la mise à jour")
    }
  }

  const handleDeleteNote = async (id: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-notes?noteId=${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        const data = await response.json()
        setSessionNotes(data.notes)
      }
    } catch (error) {
      console.error('Error deleting note:', error)
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleClearNotes = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/session-notes?clearAll=true`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setSessionNotes([])
        toast.success("Notes effacées")
      }
    } catch (error) {
      console.error('Error clearing notes:', error)
      toast.error("Erreur lors de la suppression des notes")
    }
  }

  const handleSyncNotesToNotion = async () => {
    if (sessionNotes.length === 0) {
      toast.error("Aucune note à synchroniser")
      return
    }

    setIsSyncingNotes(true)
    try {
      const response = await fetch('/api/notion/journal/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: sessionNotes,
          date: new Date().toISOString().split('T')[0],
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (result.updated) {
          toast.success(`Notes synchronisées`)
        } else {
          toast.success(`Nouvelle entrée créée dans le journal`)
        }
      } else {
        throw new Error(result.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Error syncing notes to Notion:', error)
      toast.error("Erreur lors de la synchronisation vers Notion")
    } finally {
      setIsSyncingNotes(false)
    }
  }

  const updateMonsterExhaustion = async (id: string, exhaustionLevel: number) => {
    setMonsters((prev) => prev.map((m) => (m.id === id ? { ...m, exhaustionLevel } : m)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, exhaustionLevel } : p))
      )

      // Emit exhaustion change to sync with other clients
      emitExhaustionChange({
        participantId: id,
        participantType: 'monster',
        exhaustionLevel,
      })
    }

    // Update in database
    try {
      await fetch(`/api/campaigns/${campaignId}/combat-monsters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterId: getNumericId(id), exhaustion_level: exhaustionLevel }),
      })
    } catch (error) {
      console.error('Failed to update monster exhaustion:', error)
      toast.error("Erreur de sauvegarde")
    }
  }

  const updatePlayerBuffs = async (id: string, buffs: ActiveBuff[]) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, buffs } : p)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, buffs } : p))
      )
    }

    // Emit buff change to sync with other clients (even outside combat)
    emitBuffChange({
      participantId: id,
      participantType: 'player',
      buffs,
    })

    // Persist buffs to database
    try {
      await fetch(`/api/characters/${id}/hp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buffs }),
      })
      console.log('[Buffs] Persisted to database:', id, buffs)
    } catch (error) {
      console.error('Failed to persist buffs:', error)
    }
  }

  const updateMonsterBuffs = async (id: string, buffs: ActiveBuff[]) => {
    setMonsters((prev) => prev.map((m) => (m.id === id ? { ...m, buffs } : m)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, buffs } : p))
      )

      // Emit buff change to sync with other clients
      emitBuffChange({
        participantId: id,
        participantType: 'monster',
        buffs,
      })
    }

    // Note: Monster buffs are not persisted to database (session-only)
  }

  // Update death saves for a participant (players only in practice)
  const updateDeathSaves = (
    id: string,
    type: 'player' | 'monster',
    deathSaves: { successes: number; failures: number },
    isStabilized: boolean,
    isDead: boolean
  ) => {
    setCombatParticipants((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, deathSaves, isStabilized, isDead } : p
      )
    )

    // Emit death save change to sync with other clients
    emitDeathSaveChange({
      participantId: id,
      participantType: type,
      deathSaves,
      isStabilized,
      isDead,
    })
  }

  const addMonster = async (monster: Omit<Monster, "id">) => {
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/combat-monsters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monster_id: null,
          name: monster.name,
          hp: monster.hp,
          max_hp: monster.maxHp,
          ac: monster.ac,
          initiative: monster.initiative,
          notes: monster.notes,
          status: monster.status,
        }),
      })

      if (res.ok) {
        const newMonster = await res.json()
        setMonsters((prev) => [...prev, {
          id: `m-${newMonster.id}`,
          name: newMonster.name,
          hp: newMonster.hp,
          maxHp: newMonster.max_hp,
          ac: newMonster.ac,
          initiative: newMonster.initiative,
          notes: newMonster.notes || "",
          status: newMonster.status as "actif" | "mort",
          conditions: newMonster.conditions || [],
          exhaustionLevel: newMonster.exhaustion_level || 0,
        }])
        toast.success(`${monster.name} ajouté`)
      }
    } catch (error) {
      console.error('Failed to add monster:', error)
      toast.error("Erreur lors de l'ajout")
    }
  }

  const removeMonster = async (id: string) => {
    const monster = monsters.find(m => m.id === id)
    setMonsters((prev) => prev.filter((m) => m.id !== id))
    if (combatActive) {
      setCombatParticipants((prev) => prev.filter((p) => p.id !== id))
    }

    // Delete from database
    try {
      await fetch(`/api/campaigns/${campaignId}/combat-monsters?monsterId=${getNumericId(id)}`, {
        method: 'DELETE',
      })
      if (monster) {
        toast(`${monster.name} retiré`)
      }
    } catch (error) {
      console.error('Failed to delete monster:', error)
      toast.error("Erreur lors de la suppression")
    }
  }

  // Helper function to sort participants by initiative (descending - highest first)
  // Pets are placed immediately after their owner in the initiative order
  const sortParticipantsByInitiative = (participants: CombatParticipant[]) => {
    // Separate pets from owners
    const owners = participants.filter(p => !p.isPet)
    const pets = participants.filter(p => p.isPet)

    // Sort owners by initiative (descending)
    const sortedOwners = [...owners].sort((a, b) => b.initiative - a.initiative)

    // Build final list, inserting pets after their respective owners
    const result: CombatParticipant[] = []
    for (const owner of sortedOwners) {
      result.push(owner)
      // Add all pets belonging to this owner
      const ownerPets = pets.filter(p => p.ownerId === owner.id)
      result.push(...ownerPets)
    }

    // Add orphaned pets (owner was removed) at the end
    const orphanedPets = pets.filter(p => !sortedOwners.some(o => o.id === p.ownerId))
    result.push(...orphanedPets)

    return result
  }

  // Combat setup functions
  const addPlayerToCombat = (player: Character) => {
    const participant: CombatParticipant = {
      id: player.id,
      name: player.name,
      initiative: player.initiative,
      // Use current HP (persisted in session) instead of resetting to max
      currentHp: player.currentHp,
      maxHp: player.maxHp,
      tempHp: player.tempHp,  // Keep current temp HP
      conditions: player.conditions || [],  // Keep current conditions
      conditionDurations: player.conditionDurations || {},  // Keep current condition durations
      exhaustionLevel: player.exhaustionLevel || 0,  // Keep current exhaustion
      buffs: player.buffs || [],  // Keep current buffs
      type: "player",
      level: player.level,  // For difficulty calculation (2024 rules)
      isConnected: player.isConnected,
      // Ability scores for saving throw display
      strength: player.strength,
      dexterity: player.dexterity,
      constitution: player.constitution,
      intelligence: player.intelligence,
      wisdom: player.wisdom,
      charisma: player.charisma,
    }
    const updated = sortParticipantsByInitiative([...combatParticipants, participant])
    setCombatParticipants(updated)
    toast.success(`${player.name} ajouté au combat`)

    // Sync with players via WebSocket when adding mid-combat
    if (combatActive) {
      emitCombatUpdate({
        type: 'state-sync',
        combatActive: true,
        currentTurn,
        roundNumber,
        participants: updated,
      })
    }
  }

  const addMonsterToCombat = (monster: Monster) => {
    const randomInitiative = Math.floor(Math.random() * 20) + 1
    const participant: CombatParticipant = {
      id: monster.id,
      name: monster.name,
      initiative: randomInitiative,
      currentHp: monster.hp,
      maxHp: monster.maxHp,
      ac: monster.ac,
      conditions: monster.conditions || [],
      conditionDurations: monster.conditionDurations || {},
      exhaustionLevel: monster.exhaustionLevel || 0,
      buffs: monster.buffs || [],
      type: "monster",
    }
    const updated = sortParticipantsByInitiative([...combatParticipants, participant])
    setCombatParticipants(updated)
    toast.success(`${monster.name} ajouté au combat (initiative: ${randomInitiative})`)

    // Sync with players via WebSocket when adding mid-combat
    if (combatActive) {
      emitCombatUpdate({
        type: 'state-sync',
        combatActive: true,
        currentTurn,
        roundNumber,
        participants: updated,
      })
    }
  }

  // Add a pet to an owner (player or monster)
  const addPetToOwner = (ownerId: string, pet: Omit<CombatParticipant, 'id'>) => {
    const owner = combatParticipants.find(p => p.id === ownerId)
    if (!owner) {
      toast.error("Propriétaire introuvable")
      return
    }

    const newPet: CombatParticipant = {
      ...pet,
      id: `pet-${Date.now()}`,
      initiative: owner.initiative, // Same initiative as owner
      isPet: true,
      ownerId: owner.id,
      ownerType: owner.type,
    }

    const updated = sortParticipantsByInitiative([...combatParticipants, newPet])
    setCombatParticipants(updated)
    toast(`${newPet.name} ajouté comme familier de ${owner.name}`)

    // Sync with players via WebSocket
    if (combatActive) {
      emitCombatUpdate({
        type: 'state-sync',
        combatActive: true,
        currentTurn,
        roundNumber,
        participants: updated,
      })
    }
  }

  const removeFromCombat = (id: string) => {
    const participant = combatParticipants.find(p => p.id === id)
    if (!participant) return

    // Check if this participant has any pets
    const pets = combatParticipants.filter(p => p.ownerId === id)

    if (pets.length > 0) {
      // Show orphan pet dialog
      setOrphanPetDialog({ owner: participant, pets })
      return
    }

    // No pets, proceed with removal
    executeRemoveFromCombat(id)
  }

  // Execute the actual removal (called directly or after orphan pet dialog)
  const executeRemoveFromCombat = (id: string, additionalIdsToRemove: string[] = []) => {
    const participantIndex = combatParticipants.findIndex(p => p.id === id)
    const participant = combatParticipants[participantIndex]

    // Remove the participant and any additional IDs (pets to remove)
    const idsToRemove = new Set([id, ...additionalIdsToRemove])
    const updatedParticipants = combatParticipants.filter(p => !idsToRemove.has(p.id))

    // For kept pets, remove their owner reference (make them orphans)
    const finalParticipants = updatedParticipants.map(p => {
      if (p.ownerId === id) {
        // This pet's owner is being removed but the pet is kept
        return { ...p, ownerId: undefined, ownerType: undefined }
      }
      return p
    })

    setCombatParticipants(finalParticipants)

    if (participant) {
      const removedCount = idsToRemove.size
      if (removedCount > 1) {
        toast(`${participant.name} et ${removedCount - 1} familier${removedCount > 2 ? 's' : ''} retirés du combat`)
      } else {
        toast(`${participant.name} retiré du combat`)
      }

      // Adjust currentTurn if needed
      let newCurrentTurn = currentTurn
      if (combatActive && finalParticipants.length > 0) {
        // Count how many removed participants were before current turn
        const removedBeforeCurrentTurn = combatParticipants
          .slice(0, currentTurn)
          .filter(p => idsToRemove.has(p.id)).length

        newCurrentTurn = currentTurn - removedBeforeCurrentTurn

        if (newCurrentTurn >= finalParticipants.length) {
          newCurrentTurn = Math.max(0, finalParticipants.length - 1)
        }
        if (newCurrentTurn !== currentTurn) {
          setCurrentTurn(newCurrentTurn)
        }
      }

      // Sync with players via WebSocket
      if (combatActive) {
        emitCombatUpdate({
          type: 'state-sync',
          combatActive: true,
          currentTurn: newCurrentTurn,
          roundNumber,
          participants: finalParticipants,
        })
      }
    }
  }

  // Handle orphan pet dialog confirmation
  const handleOrphanPetConfirm = (petsToKeep: string[], petsToRemove: string[]) => {
    if (!orphanPetDialog) return

    executeRemoveFromCombat(orphanPetDialog.owner.id, petsToRemove)
    setOrphanPetDialog(null)
  }

  // Add monsters from database with quantity
  const addMonstersFromDb = (dbMonster: DbMonster, quantity: number) => {
    const newParticipants: CombatParticipant[] = Array.from({ length: quantity }, (_, i) => ({
      id: `db-${dbMonster.id}-${Date.now()}-${i}`,
      name: quantity > 1 ? `${dbMonster.name} ${i + 1}` : dbMonster.name,
      initiative: Math.floor(Math.random() * 20) + 1,
      currentHp: dbMonster.hit_points || 10,
      maxHp: dbMonster.hit_points || 10,
      ac: dbMonster.armor_class || undefined,
      conditions: [],
      exhaustionLevel: 0,
      buffs: [],
      type: "monster",
      xp: dbMonster.challenge_rating_xp || undefined,
    }))

    setCombatParticipants(prev => {
      const updated = sortParticipantsByInitiative([...prev, ...newParticipants])

      // If combat is active, sync the updated participants to players (deferred to avoid setState during render)
      if (combatActive) {
        queueMicrotask(() => {
          emitCombatUpdate({
            type: 'state-sync',
            combatActive: true,
            currentTurn,
            roundNumber,
            participants: updated,
          })
        })
      }

      return updated
    })
    toast.success(`${quantity}x ${dbMonster.name} ajouté(s) au combat`)
  }

  // Add session monsters to combat with quantity (for mobile tap-to-add)
  const addSessionMonstersToCombat = (monster: Monster, quantity: number) => {
    const newParticipants: CombatParticipant[] = Array.from({ length: quantity }, (_, i) => ({
      id: `session-${monster.id}-${Date.now()}-${i}`,
      name: quantity > 1 ? `${monster.name} ${i + 1}` : monster.name,
      initiative: Math.floor(Math.random() * 20) + 1,
      currentHp: monster.hp,
      maxHp: monster.maxHp,
      ac: monster.ac,
      conditions: monster.conditions || [],
      exhaustionLevel: monster.exhaustionLevel || 0,
      buffs: monster.buffs || [],
      type: "monster",
    }))

    setCombatParticipants(prev => {
      const updated = sortParticipantsByInitiative([...prev, ...newParticipants])

      // If combat is active, sync the updated participants to players (deferred to avoid setState during render)
      if (combatActive) {
        queueMicrotask(() => {
          emitCombatUpdate({
            type: 'state-sync',
            combatActive: true,
            currentTurn,
            roundNumber,
            participants: updated,
          })
        })
      }

      return updated
    })
    toast.success(`${quantity}x ${monster.name} ajouté(s) au combat`)
  }

  // Load preset participants (replaces current participants)
  const loadPresetParticipants = (participants: CombatParticipant[]) => {
    setCombatParticipants(sortParticipantsByInitiative(participants))
  }

  const reorderParticipants = (newOrder: CombatParticipant[]) => {
    setCombatParticipants(newOrder)
  }

  // Update participant initiative in combat setup
  const updateParticipantInitiative = (id: string, initiative: number) => {
    setCombatParticipants(prev =>
      sortParticipantsByInitiative(prev.map(p => p.id === id ? { ...p, initiative } : p))
    )
    // Also update the source (player or monster)
    if (id.startsWith('p-')) {
      updatePlayerInitiative(id, initiative)
    } else if (id.startsWith('m-')) {
      // Update monster initiative in state and database
      setMonsters(prev => prev.map(m => m.id === id ? { ...m, initiative } : m))
      fetch(`/api/campaigns/${campaignId}/combat-monsters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monsterId: getNumericId(id), initiative }),
      }).catch(error => console.error('Failed to update monster initiative:', error))
    }
  }

  // Update participant name (cosmetic, only in combat state)
  const updateParticipantName = (id: string, name: string) => {
    const updated = combatParticipants.map(p => p.id === id ? { ...p, name } : p)
    setCombatParticipants(updated)

    // Sync to Redis via WebSocket so name persists on refresh
    if (combatActive) {
      emitCombatUpdate({
        type: 'state-sync',
        combatActive: true,
        currentTurn,
        roundNumber,
        participants: updated,
      })
    }
  }

  // Randomize all participant initiatives (1d20)
  const randomizeInitiatives = () => {
    setCombatParticipants(prev => {
      const updated = prev.map(p => ({
        ...p,
        initiative: Math.floor(Math.random() * 20) + 1
      }))
      // Sort by initiative descending (highest first)
      return updated.sort((a, b) => b.initiative - a.initiative)
    })
    toast.success("Initiatives randomisées!", {
      description: "Triées par ordre décroissant"
    })
  }

  // Handle ambient effect change (DM only)
  const handleAmbientEffectChange = (effect: AmbientEffect) => {
    setAmbientEffect(effect)
    // Emit to players
    emitAmbientEffect({ effect })
  }

  // Handle critical effect end - reset to previous weather effect or 'none'
  const handleEffectEnd = () => {
    // Reset to 'none' after critical animation ends
    setAmbientEffect('none')
    emitAmbientEffect({ effect: 'none' })
  }

  // Load fight preset - replaces current monsters
  const loadFightPreset = async (presetMonsters: Monster[]) => {
    // Add each monster to the database
    for (const monster of presetMonsters) {
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/combat-monsters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monster_id: null,
            name: monster.name,
            hp: monster.hp,
            max_hp: monster.maxHp,
            ac: monster.ac,
            initiative: monster.initiative,
            notes: monster.notes,
            status: monster.status,
          }),
        })

        if (res.ok) {
          const newMonster = await res.json()
          setMonsters((prev) => [...prev, {
            id: `m-${newMonster.id}`,
            name: newMonster.name,
            hp: newMonster.hp,
            maxHp: newMonster.max_hp,
            ac: newMonster.ac,
            initiative: newMonster.initiative,
            notes: newMonster.notes || "",
            status: newMonster.status as "actif" | "mort",
            conditions: newMonster.conditions || [],
            exhaustionLevel: newMonster.exhaustion_level || 0,
          }])
        }
      } catch (error) {
        console.error('Failed to add preset monster:', error)
      }
    }
  }

  // Keyboard shortcuts actions
  const keyboardActions: KeyboardActions = useMemo(() => ({
    startCombat,
    nextTurn,
    stopCombat,
    randomizeInitiatives,
    updateCurrentParticipantHp: (change: number) => {
      if (!combatActive || combatParticipants.length === 0) return
      const current = combatParticipants[currentTurn]
      if (!current) return
      if (current.type === 'player') {
        updatePlayerHp(current.id, change)
      } else {
        updateMonsterHp(current.id, change)
      }
      // Visual feedback
      const action = change > 0 ? `+${change}` : `${change}`
      toast(`${current.name}: ${action} PV`, { duration: 1500 })
    },
    openHpDialog: () => {
      if (!combatActive || combatParticipants.length === 0) return
      setKeyboardHpDialogOpen(true)
    },
    openConditionManager: () => {
      if (!combatActive || combatParticipants.length === 0) return
      setKeyboardConditionDialogOpen(true)
    },
    openBuffManager: () => {
      if (!combatActive || combatParticipants.length === 0) return
      setKeyboardBuffDialogOpen(true)
    },
    openSettings: () => setShowSettings(true),
    openNotes: () => setShowNotes(true),
    setActiveTab: (tab: string) => setActiveTab(tab as MobileTab),
    openInventory: () => {
      // For player mode - switch to players tab
      setActiveTab('players')
    },
    openSpellbook: () => {
      // For player mode - switch to spellbook tab
      setActiveTab('spellbook')
    },
    endPlayerTurn: () => {
      // TODO: Implement end turn for player
      toast("Fin de tour signalée", { duration: 1500 })
    },
  }), [
    combatActive,
    combatParticipants,
    currentTurn,
    startCombat,
    nextTurn,
    stopCombat,
    randomizeInitiatives,
    updatePlayerHp,
    updateMonsterHp,
  ])

  if (loading) {
    return <LoadingSkeleton />
  }

  // Show user selection screen if not selected yet
  if (!userSelected) {
    return (
      <UserSelectionScreen
        campaignId={campaignId}
        onSelectMJ={handleSelectMJ}
        onSelectPlayers={handleSelectPlayers}
        dmError={dmError}
        dmLoading={dmLoading}
      />
    )
  }

  // Get display name for selected characters
  const selectedCharacterNames = selectedCharacters.length > 0
    ? selectedCharacters.length === 1
      ? selectedCharacters[0].name
      : `${selectedCharacters.length} personnages`
    : undefined

  return (
    <KeyboardProvider actions={keyboardActions} mode={mode} combatActive={combatActive}>
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Ambient Effects Overlay */}
      <AmbientEffects effect={ambientEffect} onEffectEnd={handleEffectEnd} />


      {/* Monster Drop Quantity Dialog */}
      <Dialog open={!!pendingDropMonster} onOpenChange={(open) => !open && setPendingDropMonster(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-crimson">
              Ajouter {pendingDropMonster?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setDropQuantity(Math.max(1, dropQuantity - 1))}
                disabled={dropQuantity <= 1}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="text-4xl font-bold w-16 text-center">{dropQuantity}</div>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setDropQuantity(Math.min(20, dropQuantity + 1))}
                disabled={dropQuantity >= 20}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            {pendingDropMonster && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>PV: {pendingDropMonster.hit_points} | CA: {pendingDropMonster.armor_class}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDropMonster(null)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (pendingDropMonster) {
                  addMonstersFromDb(pendingDropMonster, dropQuantity)
                  setPendingDropMonster(null)
                  setDropQuantity(1)
                }
              }}
              className="bg-crimson hover:bg-crimson/80"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter {dropQuantity}x
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* XP Summary Modal */}
      <XpSummaryModal
        open={showXpModal}
        onClose={confirmEndCombat}
        killedMonsters={xpSummaryData.killedMonsters}
        playerCount={xpSummaryData.playerCount}
        isDM={mode === "mj"}
        onStartLoot={() => {
          createLootSession({})
          if (isMobile) setActiveTab("loot")
        }}
      />

      {/* Orphan Pet Dialog */}
      {orphanPetDialog && (
        <OrphanPetDialog
          owner={orphanPetDialog.owner}
          pets={orphanPetDialog.pets}
          open={true}
          onConfirm={handleOrphanPetConfirm}
          onCancel={() => setOrphanPetDialog(null)}
        />
      )}

      {/* Concentration Check Dialog */}
      <ConcentrationCheckDialog
        open={!!concentrationCheck}
        participantName={concentrationCheck?.participantName || ""}
        damage={concentrationCheck?.damage || 0}
        dc={concentrationCheck?.dc || 10}
        onResult={handleConcentrationResult}
        onCancel={handleConcentrationCancel}
      />

      {/* Group Save Config Dialog (DM only) */}
      <GroupSaveDialog
        open={showGroupSaveConfig}
        onOpenChange={setShowGroupSaveConfig}
        participants={combatParticipants}
        onInitiate={(data) => {
          initiateGroupSave(data)
          setShowGroupSaveConfig(false)
        }}
      />

      {/* Group Save Results Dialog (DM only, when save is active) */}
      {mode === "mj" && socketState.pendingGroupSave && (
        <GroupSaveResultsDialog
          open={true}
          saveType={socketState.pendingGroupSave.saveType}
          dc={socketState.pendingGroupSave.dc}
          results={socketState.pendingGroupSave.results}
          isComplete={socketState.pendingGroupSave.isComplete}
          onSubmitResult={(participantId, rollResult, success) => {
            submitGroupSaveResult({ participantId, rollResult, success })
          }}
          onClose={() => {
            cancelGroupSave()
          }}
        />
      )}

      {/* Group Save Player Dialog (player only, when save is active and they have a character in it) */}
      {mode === "joueur" && socketState.pendingGroupSave && (() => {
        // Find if any of player's characters is in the pending save and hasn't submitted yet
        const pendingResult = socketState.pendingGroupSave.results.find(r =>
          r.participantType === 'player' &&
          r.rollResult === null &&
          selectedCharacters.some(sc => String(sc.id) === r.participantId)
        )
        if (!pendingResult) return null
        return (
          <GroupSavePlayerDialog
            open={true}
            saveType={socketState.pendingGroupSave.saveType}
            dc={socketState.pendingGroupSave.dc}
            characterName={pendingResult.participantName}
            onSubmit={(rollResult, success) => {
              submitGroupSaveResult({
                participantId: pendingResult.participantId,
                rollResult,
                success,
              })
            }}
          />
        )
      })()}

      <Header
        mode={mode}
        campaignName={campaignName}
        selectedCharacterName={selectedCharacterNames}
        onSettingsClick={() => setShowSettings(true)}
        onLogout={() => {
          // Leave campaign room before clearing state
          leaveCampaign()
          setUserSelected(false)
          localStorage.removeItem("combatTrackerMode")
          localStorage.removeItem("combatTrackerCharacters")
          sessionStorage.removeItem("selectedCharacters")
        }}
        hideActions={isMobile}
        ambientEffect={ambientEffect}
        onAmbientEffectChange={handleAmbientEffectChange}
      />

      <main id="main-content" className="flex-1 p-4 overflow-hidden pb-20 md:pb-4">
        {isMobile ? (
          /* Mobile: Tab-based navigation showing one panel at a time */
          <CombatDndProvider
            players={displayPlayers}
            monsters={monsters}
            combatParticipants={combatParticipants}
            setCombatParticipants={setCombatParticipants}
            onAddPlayerToCombat={addPlayerToCombat}
            onAddMonsterToCombat={addMonsterToCombat}
            onAddDbMonsterToCombat={(dbMonster) => {
              setPendingDropMonster(dbMonster)
              setDropQuantity(1)
            }}
            onRemoveFromCombat={removeFromCombat}
            onReorderParticipants={reorderParticipants}
          >
            <div className="h-full animate-fade-in">
              {activeTab === "players" && mode === "mj" && (
                <PlayerPanel
                  key={`players-${socketState.connectedPlayers.length}`}
                  players={displayPlayers}
                  onUpdateHp={updatePlayerHp}
                  onUpdateInitiative={updatePlayerInitiative}
                  onUpdateConditions={updatePlayerConditions}
                  onUpdateExhaustion={updatePlayerExhaustion}
                  onUpdateBuffs={updatePlayerBuffs}
                  onUpdateInventory={updatePlayerInventory}
                  onSpellSlotChange={updatePlayerSpellSlot}
                  onShortRest={handleShortRest}
                  onLongRest={handleLongRest}
                  mode={mode}
                  combatActive={combatActive}
                  ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                  combatParticipants={combatParticipants}
                  onAddToCombat={addPlayerToCombat}
                />
              )}
              {activeTab === "players" && mode === "joueur" && (
                <MyCharactersPanel
                  characters={displayPlayers.filter(p => selectedCharacters.some(sc => String(sc.id) === p.id))}
                  onUpdateHp={updatePlayerHp}
                  onUpdateInventory={updatePlayerInventory}
                  combatActive={combatActive}
                />
              )}
              {activeTab === "spellbook" && mode === "joueur" && (
                <SpellbookPanel
                  characters={displayPlayers.filter(p => selectedCharacters.some(sc => String(sc.id) === p.id))}
                  onSpellSlotChange={updatePlayerSpellSlot}
                  onShortRest={handleShortRest}
                  onLongRest={handleLongRest}
                />
              )}
              {activeTab === "combat" && (
                <CombatPanel
                  participants={combatParticipants}
                  combatActive={combatActive}
                  currentTurn={currentTurn}
                  roundNumber={roundNumber}
                  onStartCombat={mode === "mj" ? startCombat : undefined}
                  onStopCombat={mode === "mj" ? stopCombat : undefined}
                  onNextTurn={mode === "mj" ? nextTurn : undefined}
                  onClearCombat={mode === "mj" ? clearCombat : undefined}
                  onUpdateHp={mode === "mj" ? (id, change, type) => {
                    if (type === "player") updatePlayerHp(id, change)
                    else updateMonsterHp(id, change)
                  } : undefined}
                  onUpdateTempHp={mode === "mj" ? (id, tempHp, type) => {
                    if (type === "player") updatePlayerTempHp(id, tempHp)
                    else updateMonsterTempHp(id, tempHp)
                  } : undefined}
                  onUpdateConditions={mode === "mj" ? (id, conditions, type, conditionDurations) => {
                    if (type === "player") updatePlayerConditions(id, conditions, conditionDurations)
                    else updateMonsterConditions(id, conditions, conditionDurations)
                  } : undefined}
                  onUpdateExhaustion={mode === "mj" ? (id, level, type) => {
                    if (type === "player") updatePlayerExhaustion(id, level)
                    else updateMonsterExhaustion(id, level)
                  } : undefined}
                  onUpdateBuffs={mode === "mj" ? (id, buffs, type) => {
                    if (type === "player") updatePlayerBuffs(id, buffs)
                    else updateMonsterBuffs(id, buffs)
                  } : undefined}
                  onUpdateDeathSaves={mode === "mj" ? updateDeathSaves : undefined}
                  onUpdateName={mode === "mj" ? updateParticipantName : undefined}
                  onRemoveFromCombat={mode === "mj" ? removeFromCombat : undefined}
                  onAddPet={mode === "mj" ? addPetToOwner : undefined}
                  mode={mode}
                  isMobile={true}
                  ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                  externalConditionDialogOpen={keyboardConditionDialogOpen}
                  onExternalConditionDialogChange={setKeyboardConditionDialogOpen}
                  externalBuffDialogOpen={keyboardBuffDialogOpen}
                  onExternalBuffDialogChange={setKeyboardBuffDialogOpen}
                  externalHpDialogOpen={keyboardHpDialogOpen}
                  onExternalHpDialogChange={setKeyboardHpDialogOpen}
                  onGroupSave={mode === "mj" ? () => setShowGroupSaveConfig(true) : undefined}
                />
              )}
              {activeTab === "setup" && mode === "mj" && (
                <CombatSetupPanel
                  onStartCombat={startCombat}
                  onRemoveFromCombat={removeFromCombat}
                  onClearCombat={clearCombat}
                  onUpdateParticipantInitiative={updateParticipantInitiative}
                  onUpdateParticipantName={updateParticipantName}
                  onRandomizeInitiatives={randomizeInitiatives}
                  onLoadPreset={loadPresetParticipants}
                  mode={mode}
                  campaignId={campaignId}
                  ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                  connectedPlayerIds={displayPlayers.filter(p => p.isConnected).map(p => p.id)}
                />
              )}
              {activeTab === "bestiary" && mode === "mj" && (
                <MonsterPickerPanel
                  onAddMonsters={addMonstersFromDb}
                  refreshKey={monsterRefreshKey}
                />
              )}
              {activeTab === "loot" && (
                <LootPanelConnected
                  currentCharacterId={selectedCharacters.length > 0 ? String(selectedCharacters[0].id) : undefined}
                  currentCharacterName={selectedCharacters.length > 0 ? selectedCharacters[0].name : undefined}
                />
              )}
            </div>
          </CombatDndProvider>
        ) : (
          /* Desktop: 3-column grid layout */
          combatActive ? (
            /* Combat active - with drag and drop for adding monsters */
            <CombatDndProvider
              players={displayPlayers}
              monsters={monsters}
              combatParticipants={combatParticipants}
              setCombatParticipants={setCombatParticipants}
              onAddPlayerToCombat={addPlayerToCombat}
              onAddMonsterToCombat={addMonsterToCombat}
              onAddDbMonsterToCombat={(dbMonster) => {
                setPendingDropMonster(dbMonster)
                setDropQuantity(1)
              }}
              onRemoveFromCombat={removeFromCombat}
              onReorderParticipants={reorderParticipants}
            >
              <div className="grid grid-cols-12 gap-4 h-full">
                {/* Left Panel - Players (MJ only) */}
                {mode === "mj" && (
                  <div className="col-span-3 h-full overflow-auto">
                    <PlayerPanel
                      players={displayPlayers}
                      onUpdateHp={updatePlayerHp}
                      onUpdateInitiative={updatePlayerInitiative}
                      onUpdateConditions={updatePlayerConditions}
                      onUpdateExhaustion={updatePlayerExhaustion}
                      onUpdateBuffs={updatePlayerBuffs}
                      onUpdateInventory={updatePlayerInventory}
                      onSpellSlotChange={updatePlayerSpellSlot}
                      onShortRest={handleShortRest}
                      onLongRest={handleLongRest}
                      mode={mode}
                      combatActive={combatActive}
                      combatParticipants={combatParticipants}
                      ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                      onAddToCombat={addPlayerToCombat}
                    />
                  </div>
                )}

                {/* Left Panel - My Characters (player only during combat) */}
                {mode === "joueur" && (
                  <div className="col-span-4 h-full overflow-auto">
                    <MyCharactersPanel
                      characters={displayPlayers.filter(p => selectedCharacters.some(sc => String(sc.id) === p.id))}
                      onUpdateHp={updatePlayerHp}
                      onUpdateInventory={updatePlayerInventory}
                      combatActive={combatActive}
                    />
                  </div>
                )}

                {/* Center-Left Panel - Spellbook (player only during combat) */}
                {mode === "joueur" && (
                  <div className="col-span-5 h-full overflow-auto">
                    <SpellbookPanel
                      characters={displayPlayers.filter(p => selectedCharacters.some(sc => String(sc.id) === p.id))}
                      onSpellSlotChange={updatePlayerSpellSlot}
                      onShortRest={handleShortRest}
                      onLongRest={handleLongRest}
                    />
                  </div>
                )}

                {/* Combat Panel (3 cols for players, 6 cols for MJ) */}
                <div className={mode === "mj" ? "col-span-6 h-full overflow-auto" : "col-span-3 h-full overflow-auto"}>
                  <CombatPanel
                    participants={combatParticipants}
                    combatActive={combatActive}
                    currentTurn={currentTurn}
                    roundNumber={roundNumber}
                    onStartCombat={mode === "mj" ? startCombat : undefined}
                    onStopCombat={mode === "mj" ? stopCombat : undefined}
                    onNextTurn={mode === "mj" ? nextTurn : undefined}
                    onClearCombat={mode === "mj" ? clearCombat : undefined}
                    onUpdateHp={mode === "mj" ? (id, change, type) => {
                      if (type === "player") updatePlayerHp(id, change)
                      else updateMonsterHp(id, change)
                    } : undefined}
                    onUpdateTempHp={mode === "mj" ? (id, tempHp, type) => {
                      if (type === "player") updatePlayerTempHp(id, tempHp)
                      else updateMonsterTempHp(id, tempHp)
                    } : undefined}
                    onUpdateConditions={mode === "mj" ? (id, conditions, type, conditionDurations) => {
                      if (type === "player") updatePlayerConditions(id, conditions, conditionDurations)
                      else updateMonsterConditions(id, conditions, conditionDurations)
                    } : undefined}
                    onUpdateExhaustion={mode === "mj" ? (id, level, type) => {
                      if (type === "player") updatePlayerExhaustion(id, level)
                      else updateMonsterExhaustion(id, level)
                    } : undefined}
                    onUpdateBuffs={mode === "mj" ? (id, buffs, type) => {
                      if (type === "player") updatePlayerBuffs(id, buffs)
                      else updateMonsterBuffs(id, buffs)
                    } : undefined}
                    onUpdateDeathSaves={mode === "mj" ? updateDeathSaves : undefined}
                    onUpdateName={mode === "mj" ? updateParticipantName : undefined}
                    onRemoveFromCombat={mode === "mj" ? removeFromCombat : undefined}
                    onAddPet={mode === "mj" ? addPetToOwner : undefined}
                    mode={mode}
                    ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                    externalConditionDialogOpen={keyboardConditionDialogOpen}
                    onExternalConditionDialogChange={setKeyboardConditionDialogOpen}
                    externalBuffDialogOpen={keyboardBuffDialogOpen}
                    onExternalBuffDialogChange={setKeyboardBuffDialogOpen}
                    externalHpDialogOpen={keyboardHpDialogOpen}
                    onExternalHpDialogChange={setKeyboardHpDialogOpen}
                    onGroupSave={mode === "mj" ? () => setShowGroupSaveConfig(true) : undefined}
                  />
                </div>

                {/* Right Panel - Monster Picker from DB (MJ only) */}
                {mode === "mj" && (
                  <div className="col-span-3 h-full overflow-auto">
                    <MonsterPickerPanel
                      onAddMonsters={addMonstersFromDb}
                      refreshKey={monsterRefreshKey}
                    />
                  </div>
                )}
              </div>
            </CombatDndProvider>
          ) : mode === "joueur" ? (
            /* Player waiting screen - show MyCharactersPanel with waiting message */
            <div className="grid grid-cols-12 gap-4 h-full">
              <div className="col-span-4 h-full overflow-auto">
                <MyCharactersPanel
                  characters={displayPlayers.filter(p => selectedCharacters.some(sc => String(sc.id) === p.id))}
                  onUpdateHp={updatePlayerHp}
                  onUpdateInventory={updatePlayerInventory}
                  combatActive={false}
                />
              </div>
              <div className="col-span-4 h-full overflow-auto">
                <SpellbookPanel
                  characters={displayPlayers.filter(p => selectedCharacters.some(sc => String(sc.id) === p.id))}
                  onSpellSlotChange={updatePlayerSpellSlot}
                  onShortRest={handleShortRest}
                  onLongRest={handleLongRest}
                />
              </div>
              <div className="col-span-4 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gold animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">En attente du combat...</h2>
                  <p className="text-muted-foreground max-w-md">
                    Le Maître du Jeu prépare le combat. La bataille commencera bientôt !
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Combat setup - with drag and drop (MJ only) */
            <CombatDndProvider
              players={displayPlayers}
              monsters={monsters}
              combatParticipants={combatParticipants}
              setCombatParticipants={setCombatParticipants}
              onAddPlayerToCombat={addPlayerToCombat}
              onAddMonsterToCombat={addMonsterToCombat}
              onAddDbMonsterToCombat={(dbMonster) => {
                setPendingDropMonster(dbMonster)
                setDropQuantity(1)
              }}
              onRemoveFromCombat={removeFromCombat}
              onReorderParticipants={reorderParticipants}
            >
              <div className="grid grid-cols-12 gap-4 h-full">
                {/* Left Panel - Players (MJ only) */}
                {mode === "mj" && (
                  <div className="col-span-3 h-full overflow-auto">
                    <PlayerPanel
                      players={displayPlayers}
                      onUpdateHp={updatePlayerHp}
                      onUpdateInitiative={updatePlayerInitiative}
                      onUpdateConditions={updatePlayerConditions}
                      onUpdateExhaustion={updatePlayerExhaustion}
                      onUpdateBuffs={updatePlayerBuffs}
                      onUpdateInventory={updatePlayerInventory}
                      onSpellSlotChange={updatePlayerSpellSlot}
                      onShortRest={handleShortRest}
                      onLongRest={handleLongRest}
                      mode={mode}
                      combatActive={combatActive}
                      combatParticipants={combatParticipants}
                      ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                      onAddToCombat={addPlayerToCombat}
                    />
                  </div>
                )}

                {/* Center Panel - Combat Setup */}
                <div className={mode === "mj" ? "col-span-6 h-full overflow-auto" : "col-span-12 h-full overflow-auto"}>
                  <CombatSetupPanel
                    onStartCombat={startCombat}
                    onRemoveFromCombat={removeFromCombat}
                    onClearCombat={clearCombat}
                    onUpdateParticipantInitiative={updateParticipantInitiative}
                    onUpdateParticipantName={updateParticipantName}
                    onRandomizeInitiatives={randomizeInitiatives}
                    onLoadPreset={loadPresetParticipants}
                    mode={mode}
                    campaignId={campaignId}
                    ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                    connectedPlayerIds={displayPlayers.filter(p => p.isConnected).map(p => p.id)}
                  />
                </div>

                {/* Right Panel - Monster Picker from DB (MJ only) */}
                {mode === "mj" && (
                  <div className="col-span-3 h-full overflow-auto">
                    <MonsterPickerPanel
                      onAddMonsters={addMonstersFromDb}
                      refreshKey={monsterRefreshKey}
                    />
                  </div>
                )}
              </div>
            </CombatDndProvider>
          )
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          mode={mode}
          combatActive={combatActive}
          hasLootSession={!!socketState.lootSession}
        />
      )}

      {/* Panels */}
      <CombatHistoryPanel
        open={showHistory}
        onOpenChange={setShowHistory}
        history={combatHistory}
      />

      <SettingsPanel
        open={showSettings}
        onOpenChange={setShowSettings}
        campaignId={campaignId}
        campaignName={campaignName}
        onCampaignNameChange={setCampaignName}
        onMonsterSyncComplete={() => setMonsterRefreshKey(k => k + 1)}
      />

      {/* Session Notes Panel - MJ only */}
      {mode === "mj" && (
        <NotesPanel
          open={showNotes}
          onOpenChange={setShowNotes}
          notes={sessionNotes}
          onAddNote={handleAddNote}
          onUpdateNote={handleUpdateNote}
          onDeleteNote={handleDeleteNote}
          onSyncToNotion={handleSyncNotesToNotion}
          onClearNotes={handleClearNotes}
          isSyncing={isSyncingNotes}
        />
      )}

      {/* AI Assistant Sidebar - MJ only, desktop only */}
      {mode === "mj" && !isMobile && (
        <>
          {/* Collapsible sidebar panel */}
          {showAIAssistant && (
            <div className="fixed right-0 top-0 h-full w-80 z-40 shadow-xl">
              <AIAssistantPanel
                isOpen={showAIAssistant}
                onToggle={() => setShowAIAssistant(!showAIAssistant)}
                combatContext={aiCombatContext}
              />
            </div>
          )}
          {/* Floating toggle button when closed */}
          {!showAIAssistant && (
            <AIAssistantPanel
              isOpen={false}
              onToggle={() => setShowAIAssistant(true)}
              combatContext={aiCombatContext}
            />
          )}
        </>
      )}

      {/* Loot Panel Modal - Desktop only, when there's a loot session */}
      {!isMobile && socketState.lootSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl h-[85vh] bg-card border border-amber-500/30 rounded-lg shadow-2xl overflow-hidden">
            <LootPanelConnected
              currentCharacterId={selectedCharacters.length > 0 ? String(selectedCharacters[0].id) : undefined}
              currentCharacterName={selectedCharacters.length > 0 ? selectedCharacters[0].name : undefined}
            />
          </div>
        </div>
      )}

      {/* Loot Distribution Summary Dialog */}
      <LootDistributionSummaryDialog
        isOpen={showLootSummary}
        onClose={handleCloseLootSummary}
        distributions={socketState.lootDistributions || []}
        currentCharacterId={mode === "joueur" && selectedCharacters.length > 0 ? String(selectedCharacters[0].id) : undefined}
      />

      {/* Floating Notes Button - MJ only */}
      {mode === "mj" && (
        <Button
          onClick={() => setShowNotes(true)}
          className={`fixed right-6 z-40 h-14 w-14 rounded-full shadow-lg bg-gold hover:bg-gold/80 text-background ${
            isMobile ? "bottom-24" : "bottom-6"
          }`}
          size="icon"
          title="Notes de session"
        >
          <NotebookPen className="h-6 w-6" />
        </Button>
      )}
    </div>
    </KeyboardProvider>
  )
}

export default function CombatTracker() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CombatTrackerContent />
    </Suspense>
  )
}
