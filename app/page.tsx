"use client"

import { useState, useEffect, Suspense } from "react"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Header } from "@/components/header"
import { MobileNav, type MobileTab } from "@/components/mobile-nav"
import { PlayerPanel } from "@/components/player-panel"
import { CombatPanel } from "@/components/combat-panel"
import { CombatSetupPanel } from "@/components/combat-setup-panel"
import { CombatDndProvider } from "@/components/combat-dnd-context"
import { BestiaryPanel } from "@/components/bestiary-panel"
import { MonsterPickerPanel } from "@/components/monster-picker-panel"
import { CombatHistoryPanel, type HistoryEntry } from "@/components/combat-history-panel"
import { SettingsPanel } from "@/components/settings-panel"
import { UserSelectionScreen } from "@/components/user-selection-screen"
import { LoadingSkeleton } from "@/components/loading-skeleton"
import { toast } from "sonner"
import { useSocketContext } from "@/lib/socket-context"
import type { Character, Monster, CombatParticipant, DbMonster } from "@/lib/types"
import { AmbientEffects, type AmbientEffect } from "@/components/ambient-effects"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"

// Default campaign ID (single session)
const DEFAULT_CAMPAIGN_ID = 1

// Character info from selection screen
interface SelectedCharacter {
  id: number
  name: string
  class: string
  level: number
  current_hp: number
  max_hp: number
  ac: number
  initiative: number
  conditions: string[]
}

// Type alias for easier reading
type SelectedCharacters = SelectedCharacter[]

// Extract numeric ID from prefixed ID (e.g., "p-1" -> 1, "m-2" -> 2)
function getNumericId(prefixedId: string): number {
  return parseInt(prefixedId.split('-')[1], 10)
}

function CombatTrackerContent() {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState<MobileTab>("combat")

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
    emitDeathSaveChange,
    emitAmbientEffect,
  } = useSocketContext()

  // User selection state - null means not selected yet
  const [userSelected, setUserSelected] = useState(false)
  const [mode, setMode] = useState<"mj" | "joueur">("mj")
  const [selectedCharacters, setSelectedCharacters] = useState<SelectedCharacters>([])

  // Fixed campaign ID (single session)
  const campaignId = DEFAULT_CAMPAIGN_ID
  const [campaignName, setCampaignName] = useState("")
  const [players, setPlayers] = useState<Character[]>([])
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
  const [combatHistory, setCombatHistory] = useState<HistoryEntry[]>([])
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
            // Convert back to SelectedCharacters format for state
            setSelectedCharacters(charactersData.map((char: { odNumber: string | number; name: string; class: string; level: number; currentHp: number; maxHp: number; ac: number; initiative: number; conditions: string[] }) => ({
              id: char.odNumber,
              name: char.name,
              class: char.class,
              level: char.level,
              current_hp: char.currentHp,
              max_hp: char.maxHp,
              ac: char.ac,
              initiative: char.initiative,
              conditions: char.conditions,
            })))
            setUserSelected(true)
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

    // Join campaign as DM with password
    if (socketState.isConnected) {
      console.log('[Socket] User selected MJ, joining as DM')
      joinCampaign({ role: 'dm', password })
    } else {
      // Socket not ready yet
      setDmLoading(false)
      setDmError("Connexion au serveur en cours...")
    }
  }

  // Handle players selection (multiple characters)
  const handleSelectPlayers = (characters: SelectedCharacters) => {
    setMode("joueur")
    setSelectedCharacters(characters)
    setUserSelected(true)
    // Persist mode and characters to localStorage
    localStorage.setItem("combatTrackerMode", "joueur")
    if (characters.length > 0) {
      const charactersData = characters.map(char => ({
        odNumber: char.id,
        name: char.name,
        class: char.class,
        level: char.level,
        currentHp: char.current_hp,
        maxHp: char.max_hp,
        ac: char.ac,
        initiative: char.initiative,
        conditions: char.conditions || [],
        exhaustionLevel: 0,
      }))
      localStorage.setItem("combatTrackerCharacters", JSON.stringify(charactersData))
      // Also keep in sessionStorage for backward compatibility
      sessionStorage.setItem("selectedCharacters", JSON.stringify(charactersData))
      // Join campaign as player with characters
      if (socketState.isConnected) {
        console.log('[Socket] User selected player with characters:', charactersData.map(c => c.name).join(', '))
        joinCampaign({ role: 'player', characters: charactersData })
      }
    }
  }

  // Fetch campaign data on mount
  useEffect(() => {
    async function fetchCampaignData() {
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
          // Map Notion fields to frontend fields
          setPlayers(charactersData.map((c: {
            id: string
            name: string
            class: string
            level: number
            current_hp: number
            max_hp: number
            ac: number
            initiative: number
            conditions: string[]
          }) => ({
            id: c.id,
            name: c.name,
            class: c.class,
            level: c.level,
            currentHp: c.current_hp,
            maxHp: c.max_hp,
            ac: c.ac,
            initiative: c.initiative,
            conditions: c.conditions || [],
            exhaustionLevel: 0,
          })))
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

  // Sync ambient effect from socket context
  useEffect(() => {
    if (socketState.ambientEffect !== ambientEffect) {
      setAmbientEffect(socketState.ambientEffect as AmbientEffect)
    }
  }, [socketState.ambientEffect, ambientEffect])

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
    }
  }, [socketState.isJoined, socketState.mode, dmLoading])

  // Handle join errors from socket context
  useEffect(() => {
    if (socketState.joinError) {
      console.log('[Socket] Join error:', socketState.joinError)
      setDmLoading(false)
      setDmError(socketState.joinError)
    }
  }, [socketState.joinError])

  // Auto-join campaign on socket connect if user already selected (page refresh)
  useEffect(() => {
    if (!socketState.isConnected || socketState.isJoined) return

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
  }, [socketState.isConnected, socketState.isJoined, joinCampaign])

  // Convert connected players to Character format for the UI
  // Flatten characters array from each connected player and add grouping metadata
  // MJ mode: only show connected players (empty if none connected)
  // Player mode: show their own characters from players state
  const displayPlayers: Character[] = mode === 'mj'
    ? socketState.connectedPlayers.flatMap(player =>
        player.characters.map((char, idx) => ({
          id: String(char.odNumber), // Use Notion UUID directly (stored as odNumber for compatibility)
          name: char.name,
          class: char.class,
          level: char.level,
          currentHp: char.currentHp,
          maxHp: char.maxHp,
          ac: char.ac,
          initiative: char.initiative,
          conditions: char.conditions || [],
          exhaustionLevel: char.exhaustionLevel || 0,
          // Add metadata for grouping
          playerSocketId: player.socketId,
          isFirstInGroup: idx === 0,
          groupSize: player.characters.length,
        }))
      )
    : players

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
          exhaustionLevel: p.exhaustionLevel || 0,
        })),
        ...monsters.map((m) => ({
          id: m.id,
          name: m.name,
          initiative: m.initiative,
          currentHp: m.hp,
          maxHp: m.maxHp,
          conditions: m.conditions || [],
          exhaustionLevel: m.exhaustionLevel || 0,
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

  const stopCombat = () => {
    addHistoryEntry({ type: "combat_end" })
    setCombatActive(false)
    setCombatParticipants([])
    setCurrentTurn(0)
    setRoundNumber(1)
    setCombatHistory([]) // Clear history when combat ends

    // Emit socket event to sync with players
    emitCombatUpdate({
      type: 'stop',
      combatActive: false,
      currentTurn: 0,
      roundNumber: 1,
    })

    toast("Combat terminé")
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
    const nextIndex = (currentTurn + 1) % combatParticipants.length
    // Increment round when cycling back to first participant
    const newRound = nextIndex === 0 ? roundNumber + 1 : roundNumber

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
      }
    }

    setCurrentTurn(nextIndex)
    if (nextIndex === 0) {
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
      if (nextIndex === 0) {
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

  const updatePlayerHp = async (id: string, change: number) => {
    const player = players.find(p => p.id === id)
    if (!player) return

    const newHp = Math.max(0, Math.min(player.maxHp, player.currentHp + change))
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
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, currentHp: newHp } : p)),
    )
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, currentHp: newHp } : p)),
      )

      // Emit HP change to sync with other clients
      emitHpChange({
        participantId: id,
        participantType: 'player',
        newHp,
        change,
        source: mode === 'mj' ? 'dm' : 'player',
      })

      // Reset death saves when healed from 0 HP
      if (wasAtZeroHp && newHp > 0) {
        updateDeathSaves(id, 'player', { successes: 0, failures: 0 }, false, false)
      }
    }

    // Note: Character HP is session-only (from Notion), no DB persistence
  }

  const updateMonsterHp = async (id: string, change: number) => {
    // Try to find in monsters array first, then fall back to combat participants
    const monster = monsters.find(m => m.id === id)
    const participant = combatParticipants.find(p => p.id === id && p.type === 'monster')

    // Need either monster or participant to update
    if (!monster && !participant) return

    const currentHp = monster?.hp ?? participant?.currentHp ?? 0
    const maxHp = monster?.maxHp ?? participant?.maxHp ?? currentHp
    const name = monster?.name ?? participant?.name ?? 'Monster'
    const newHp = Math.max(0, Math.min(maxHp, currentHp + change))

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

    // Update monsters array if monster exists there
    if (monster) {
      setMonsters((prev) =>
        prev.map((m) => (m.id === id ? { ...m, hp: newHp } : m)),
      )
    }

    // Always update combat participants during combat
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, currentHp: newHp } : p)),
      )

      // Emit HP change to sync with other clients
      emitHpChange({
        participantId: id,
        participantType: 'monster',
        newHp,
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
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, initiative } : p)))
    // Note: Character initiative is session-only (from Notion), no DB persistence
  }

  const updatePlayerConditions = async (id: string, conditions: string[], conditionDurations?: Record<string, number>) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, conditions } : p)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, conditions, conditionDurations } : p))
      )

      // Emit condition change to sync with other clients
      emitConditionChange({
        participantId: id,
        participantType: 'player',
        conditions,
        conditionDurations,
      })
    }

    // Note: Character conditions are session-only (from Notion), no DB persistence
  }

  const updatePlayerExhaustion = async (id: string, exhaustionLevel: number) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, exhaustionLevel } : p)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, exhaustionLevel } : p))
      )

      // Emit exhaustion change to sync with other clients
      emitExhaustionChange({
        participantId: id,
        participantType: 'player',
        exhaustionLevel,
      })
    }

    // Note: Character exhaustion is session-only (from Notion), no DB persistence
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
  const sortParticipantsByInitiative = (participants: CombatParticipant[]) => {
    return [...participants].sort((a, b) => b.initiative - a.initiative)
  }

  // Combat setup functions
  const addPlayerToCombat = (player: Character) => {
    const participant: CombatParticipant = {
      id: player.id,
      name: player.name,
      initiative: player.initiative,
      currentHp: player.currentHp,
      maxHp: player.maxHp,
      conditions: player.conditions,
      exhaustionLevel: player.exhaustionLevel || 0,
      type: "player",
    }
    setCombatParticipants(prev => sortParticipantsByInitiative([...prev, participant]))
    toast.success(`${player.name} ajouté au combat`)
  }

  const addMonsterToCombat = (monster: Monster) => {
    const randomInitiative = Math.floor(Math.random() * 20) + 1
    const participant: CombatParticipant = {
      id: monster.id,
      name: monster.name,
      initiative: randomInitiative,
      currentHp: monster.hp,
      maxHp: monster.maxHp,
      conditions: monster.conditions || [],
      exhaustionLevel: monster.exhaustionLevel || 0,
      type: "monster",
    }
    setCombatParticipants(prev => sortParticipantsByInitiative([...prev, participant]))
    toast.success(`${monster.name} ajouté au combat (initiative: ${randomInitiative})`)
  }

  const removeFromCombat = (id: string) => {
    const participantIndex = combatParticipants.findIndex(p => p.id === id)
    const participant = combatParticipants[participantIndex]
    const updatedParticipants = combatParticipants.filter(p => p.id !== id)
    setCombatParticipants(updatedParticipants)

    if (participant) {
      toast(`${participant.name} retiré du combat`)

      // Adjust currentTurn if needed
      let newCurrentTurn = currentTurn
      if (combatActive && updatedParticipants.length > 0) {
        if (participantIndex < currentTurn) {
          // Removed participant was before current turn, shift back
          newCurrentTurn = currentTurn - 1
        } else if (currentTurn >= updatedParticipants.length) {
          // Current turn is now out of bounds
          newCurrentTurn = Math.max(0, updatedParticipants.length - 1)
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
          participants: updatedParticipants,
        })
      }
    }
  }

  // Add monsters from database with quantity
  const addMonstersFromDb = (dbMonster: DbMonster, quantity: number) => {
    const newParticipants: CombatParticipant[] = Array.from({ length: quantity }, (_, i) => ({
      id: `db-${dbMonster.id}-${Date.now()}-${i}`,
      name: quantity > 1 ? `${dbMonster.name} ${i + 1}` : dbMonster.name,
      initiative: Math.floor(Math.random() * 20) + 1,
      currentHp: dbMonster.hit_points || 10,
      maxHp: dbMonster.hit_points || 10,
      conditions: [],
      exhaustionLevel: 0,
      type: "monster",
      xp: dbMonster.challenge_rating_xp || undefined,
    }))

    setCombatParticipants(prev => {
      const updated = sortParticipantsByInitiative([...prev, ...newParticipants])

      // If combat is active, sync the updated participants to players
      if (combatActive) {
        emitCombatUpdate({
          type: 'state-sync',
          combatActive: true,
          currentTurn,
          roundNumber,
          participants: updated,
        })
      }

      return updated
    })
    toast.success(`${quantity}x ${dbMonster.name} ajouté(s) au combat`)
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
    <div className="min-h-screen bg-background flex flex-col">
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
          <div className="h-full animate-fade-in">
            {activeTab === "players" && (
              <PlayerPanel
                players={displayPlayers}
                onUpdateHp={updatePlayerHp}
                onUpdateInitiative={updatePlayerInitiative}
                onUpdateConditions={updatePlayerConditions}
                onUpdateExhaustion={updatePlayerExhaustion}
                mode={mode}
                ownCharacterIds={selectedCharacters.map(c => String(c.id))}
              />
            )}
            {activeTab === "combat" && (
              <CombatPanel
                participants={combatParticipants}
                combatActive={combatActive}
                currentTurn={currentTurn}
                roundNumber={roundNumber}
                onStartCombat={startCombat}
                onStopCombat={stopCombat}
                onNextTurn={nextTurn}
                onClearCombat={mode === "mj" ? clearCombat : undefined}
                onUpdateHp={(id, change, type) => {
                  if (type === "player") updatePlayerHp(id, change)
                  else updateMonsterHp(id, change)
                }}
                onUpdateConditions={(id, conditions, type, conditionDurations) => {
                  if (type === "player") updatePlayerConditions(id, conditions, conditionDurations)
                  else updateMonsterConditions(id, conditions, conditionDurations)
                }}
                onUpdateExhaustion={(id, level, type) => {
                  if (type === "player") updatePlayerExhaustion(id, level)
                  else updateMonsterExhaustion(id, level)
                }}
                onUpdateDeathSaves={updateDeathSaves}
                onRemoveFromCombat={removeFromCombat}
                mode={mode}
                ownCharacterIds={selectedCharacters.map(c => String(c.id))}
              />
            )}
            {activeTab === "bestiary" && mode === "mj" && (
              <BestiaryPanel
                monsters={monsters}
                onAddMonster={addMonster}
                onRemoveMonster={removeMonster}
                onUpdateHp={updateMonsterHp}
                onLoadPreset={loadFightPreset}
                mode={mode}
                combatActive={combatActive}
                combatParticipants={combatParticipants}
                campaignId={campaignId}
              />
            )}
          </div>
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
                  <div className="col-span-3 overflow-auto">
                    <PlayerPanel
                      players={displayPlayers}
                      onUpdateHp={updatePlayerHp}
                      onUpdateInitiative={updatePlayerInitiative}
                      onUpdateConditions={updatePlayerConditions}
                      onUpdateExhaustion={updatePlayerExhaustion}
                      mode={mode}
                      combatActive={combatActive}
                      combatParticipants={combatParticipants}
                      ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                    />
                  </div>
                )}

                {/* Center Panel - Combat (full width for players, 6 cols for MJ) */}
                <div className={mode === "mj" ? "col-span-6 overflow-auto" : "col-span-12 overflow-auto"}>
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
                    onUpdateConditions={mode === "mj" ? (id, conditions, type, conditionDurations) => {
                      if (type === "player") updatePlayerConditions(id, conditions, conditionDurations)
                      else updateMonsterConditions(id, conditions, conditionDurations)
                    } : undefined}
                    onUpdateExhaustion={mode === "mj" ? (id, level, type) => {
                      if (type === "player") updatePlayerExhaustion(id, level)
                      else updateMonsterExhaustion(id, level)
                    } : undefined}
                    onUpdateDeathSaves={mode === "mj" ? updateDeathSaves : undefined}
                    onRemoveFromCombat={mode === "mj" ? removeFromCombat : undefined}
                    mode={mode}
                    ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                  />
                </div>

                {/* Right Panel - Monster Picker from DB (MJ only) */}
                {mode === "mj" && (
                  <div className="col-span-3 overflow-auto">
                    <MonsterPickerPanel
                      onAddMonsters={addMonstersFromDb}
                    />
                  </div>
                )}
              </div>
            </CombatDndProvider>
          ) : mode === "joueur" ? (
            /* Player waiting screen - combat not started yet */
            <div className="flex items-center justify-center h-full">
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
                {selectedCharacters.length > 0 && (
                  <div className="mt-6 p-4 bg-secondary/30 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-2">Vos personnages :</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {selectedCharacters.map((char) => (
                        <span key={char.id} className="px-3 py-1 bg-gold/10 text-gold rounded-full text-sm font-medium">
                          {char.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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
                  <div className="col-span-3 overflow-auto">
                    <PlayerPanel
                      players={displayPlayers}
                      onUpdateHp={updatePlayerHp}
                      onUpdateInitiative={updatePlayerInitiative}
                      onUpdateConditions={updatePlayerConditions}
                      onUpdateExhaustion={updatePlayerExhaustion}
                      mode={mode}
                      combatActive={combatActive}
                      combatParticipants={combatParticipants}
                      ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                    />
                  </div>
                )}

                {/* Center Panel - Combat Setup */}
                <div className={mode === "mj" ? "col-span-6 overflow-auto" : "col-span-12 overflow-auto"}>
                  <CombatSetupPanel
                    onStartCombat={startCombat}
                    onRemoveFromCombat={removeFromCombat}
                    onClearCombat={clearCombat}
                    onUpdateParticipantInitiative={updateParticipantInitiative}
                    onRandomizeInitiatives={randomizeInitiatives}
                    onLoadPreset={loadPresetParticipants}
                    mode={mode}
                    campaignId={campaignId}
                    ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                  />
                </div>

                {/* Right Panel - Monster Picker from DB (MJ only) */}
                {mode === "mj" && (
                  <div className="col-span-3 overflow-auto">
                    <MonsterPickerPanel
                      onAddMonsters={addMonstersFromDb}
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
          onNotesClick={() => setShowHistory(true)}
          mode={mode}
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
      />
    </div>
  )
}

export default function CombatTracker() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CombatTrackerContent />
    </Suspense>
  )
}
