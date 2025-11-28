"use client"

import { useState, useEffect, useRef, Suspense } from "react"
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
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket"
import type { ConnectedPlayer } from "@/lib/socket-events"
import type { Character, Monster, CombatParticipant, DbMonster } from "@/lib/types"
import { AmbientEffects, type AmbientEffect } from "@/components/ambient-effects"

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

  // User selection state - null means not selected yet
  const [userSelected, setUserSelected] = useState(false)
  const [mode, setMode] = useState<"mj" | "joueur">("mj")
  const [selectedCharacters, setSelectedCharacters] = useState<SelectedCharacters>([])

  // Fixed campaign ID (single session)
  const campaignId = DEFAULT_CAMPAIGN_ID
  const [campaignName, setCampaignName] = useState("")
  const [players, setPlayers] = useState<Character[]>([])
  const [connectedPlayers, setConnectedPlayers] = useState<ConnectedPlayer[]>([])
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [combatActive, setCombatActive] = useState(false)
  const [currentTurn, setCurrentTurn] = useState(0)
  const [roundNumber, setRoundNumber] = useState(1)
  const [combatParticipants, setCombatParticipants] = useState<CombatParticipant[]>([])
  const [loading, setLoading] = useState(true)
  const [socketConnected, setSocketConnected] = useState(false)

  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [combatHistory, setCombatHistory] = useState<HistoryEntry[]>([])
  const [ambientEffect, setAmbientEffect] = useState<AmbientEffect>("none")

  // Refs to access current state in socket handlers without causing reconnections
  const combatActiveRef = useRef(combatActive)
  const currentTurnRef = useRef(currentTurn)
  const combatParticipantsRef = useRef(combatParticipants)

  // Keep refs updated when state changes
  useEffect(() => {
    combatActiveRef.current = combatActive
  }, [combatActive])

  useEffect(() => {
    currentTurnRef.current = currentTurn
  }, [currentTurn])

  useEffect(() => {
    combatParticipantsRef.current = combatParticipants
  }, [combatParticipants])

  // Handle MJ selection
  const handleSelectMJ = () => {
    setMode("mj")
    setSelectedCharacters([])
    setUserSelected(true)
  }

  // Handle players selection (multiple characters)
  const handleSelectPlayers = (characters: SelectedCharacters) => {
    setMode("joueur")
    setSelectedCharacters(characters)
    setUserSelected(true)
    // Store ALL characters in sessionStorage for socket connection
    if (characters.length > 0) {
      sessionStorage.setItem("selectedCharacters", JSON.stringify(
        characters.map(char => ({
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
      ))
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

        // Fetch characters
        const charactersRes = await fetch(`/api/campaigns/${campaignId}/characters`)
        if (charactersRes.ok) {
          const charactersData = await charactersRes.json()
          // Map database fields to frontend fields
          setPlayers(charactersData.map((c: {
            id: number
            name: string
            class: string
            level: number
            current_hp: number
            max_hp: number
            ac: number
            initiative: number
            conditions: string[]
            exhaustion_level: number
          }) => ({
            id: `p-${c.id}`,
            name: c.name,
            class: c.class,
            level: c.level,
            currentHp: c.current_hp,
            maxHp: c.max_hp,
            ac: c.ac,
            initiative: c.initiative,
            conditions: c.conditions || [],
            exhaustionLevel: c.exhaustion_level || 0,
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

  // Socket connection for real-time player tracking
  useEffect(() => {
    const socket = connectSocket()

    socket.on('connect', () => {
      setSocketConnected(true)
      console.log('[Socket] Connected')

      // Join the campaign room
      if (mode === 'joueur') {
        // Get selected characters from sessionStorage
        const storedCharacters = sessionStorage.getItem('selectedCharacters')
        if (storedCharacters) {
          const characters = JSON.parse(storedCharacters)
          socket.emit('join-campaign', {
            campaignId,
            role: 'player',
            characters: characters
          })
          // Clear sessionStorage after using it
          sessionStorage.removeItem('selectedCharacters')
        }
      } else {
        // DM joins without characters
        socket.emit('join-campaign', {
          campaignId,
          role: 'dm',
        })
      }
    })

    socket.on('disconnect', () => {
      setSocketConnected(false)
      console.log('[Socket] Disconnected')
    })

    // Listen for connected players updates
    socket.on('connected-players', (data) => {
      console.log('[Socket] Connected players:', data.players)
      setConnectedPlayers(data.players)
    })

    socket.on('player-connected', (data) => {
      const characterNames = data.player.characters.map(c => c.name).join(', ')
      console.log('[Socket] Player connected:', characterNames)
      setConnectedPlayers(prev => {
        // Avoid duplicates
        if (prev.some(p => p.socketId === data.player.socketId)) return prev
        return [...prev, data.player]
      })
      if (mode === 'mj') {
        toast.success(`${characterNames} a rejoint la partie`)
      }
    })

    socket.on('player-disconnected', (data) => {
      console.log('[Socket] Player disconnected:', data.socketId)
      setConnectedPlayers(prev => {
        const player = prev.find(p => p.socketId === data.socketId)
        if (player && mode === 'mj') {
          const characterNames = player.characters.map(c => c.name).join(', ')
          toast(`${characterNames} a quitté la partie`)
        }
        return prev.filter(p => p.socketId !== data.socketId)
      })
    })

    // Listen for combat updates from other clients
    socket.on('combat-update', (data) => {
      console.log('[Socket] Combat update received:', data.type)
      if (data.type === 'start') {
        setCombatActive(true)
        setCurrentTurn(data.currentTurn)
        setRoundNumber(data.roundNumber || 1)
        if (data.participants) {
          setCombatParticipants(data.participants as CombatParticipant[])
        }
        if (mode === 'joueur') {
          toast.success("Le combat a commencé!")
        }
      } else if (data.type === 'stop') {
        setCombatActive(false)
        setCombatParticipants([])
        setCurrentTurn(0)
        setRoundNumber(1)
        if (mode === 'joueur') {
          toast("Le combat est terminé")
        }
      } else if (data.type === 'next-turn') {
        setCurrentTurn(data.currentTurn)
        if (data.roundNumber) {
          setRoundNumber(data.roundNumber)
        }
        // Show toast for players when turn changes
        if (mode === 'joueur') {
          // Use ref to get current participants (avoids stale closure)
          const participant = combatParticipantsRef.current[data.currentTurn]
          if (participant) {
            if (data.currentTurn === 0 && data.roundNumber > 1) {
              toast.success(`Round ${data.roundNumber} - Tour de ${participant.name}`)
            } else {
              toast(`Tour de ${participant.name}`, { duration: 2000 })
            }
          }
        }
      } else if (data.type === 'state-sync' && data.participants) {
        setCombatActive(data.combatActive)
        setCurrentTurn(data.currentTurn)
        setRoundNumber(data.roundNumber || 1)
        setCombatParticipants(data.participants as CombatParticipant[])
      }
    })

    // Listen for HP changes from other clients
    socket.on('hp-change', (data) => {
      console.log('[Socket] HP change received:', data)
      setCombatParticipants(prev =>
        prev.map(p => p.id === data.participantId ? { ...p, currentHp: data.newHp } : p)
      )
      if (data.participantType === 'player') {
        setPlayers(prev =>
          prev.map(p => p.id === data.participantId ? { ...p, currentHp: data.newHp } : p)
        )
      } else {
        setMonsters(prev =>
          prev.map(m => m.id === data.participantId ? { ...m, hp: data.newHp } : m)
        )
      }
    })

    // Listen for condition changes from other clients
    socket.on('condition-change', (data) => {
      console.log('[Socket] Condition change received:', data)
      setCombatParticipants(prev =>
        prev.map(p => p.id === data.participantId ? { ...p, conditions: data.conditions, conditionDurations: data.conditionDurations } : p)
      )
      if (data.participantType === 'player') {
        setPlayers(prev =>
          prev.map(p => p.id === data.participantId ? { ...p, conditions: data.conditions } : p)
        )
      } else {
        setMonsters(prev =>
          prev.map(m => m.id === data.participantId ? { ...m, conditions: data.conditions } : m)
        )
      }
    })

    // Listen for exhaustion changes from other clients
    socket.on('exhaustion-change', (data) => {
      console.log('[Socket] Exhaustion change received:', data)
      setCombatParticipants(prev =>
        prev.map(p => p.id === data.participantId ? { ...p, exhaustionLevel: data.exhaustionLevel } : p)
      )
      if (data.participantType === 'player') {
        setPlayers(prev =>
          prev.map(p => p.id === data.participantId ? { ...p, exhaustionLevel: data.exhaustionLevel } : p)
        )
      } else {
        setMonsters(prev =>
          prev.map(m => m.id === data.participantId ? { ...m, exhaustionLevel: data.exhaustionLevel } : m)
        )
      }
    })

    // Listen for state sync requests (players request sync from DM)
    socket.on('request-state-sync', () => {
      console.log('[Socket] State sync requested')
      // Only DM responds to sync requests - use refs to get current values
      if (mode === 'mj' && combatActiveRef.current) {
        socket.emit('combat-update', {
          type: 'state-sync',
          combatActive: combatActiveRef.current,
          currentTurn: currentTurnRef.current,
          participants: combatParticipantsRef.current,
        })
      }
    })

    // Listen for notifications from other clients
    socket.on('notification', (data) => {
      console.log('[Socket] Notification received:', data.message)
      if (data.type === 'success') {
        toast.success(data.message, { description: data.description })
      } else if (data.type === 'error') {
        toast.error(data.message, { description: data.description })
      } else if (data.type === 'warning') {
        toast.warning(data.message, { description: data.description })
      } else {
        toast(data.message, { description: data.description })
      }
    })

    // Listen for ambient effect changes from DM
    socket.on('ambient-effect', (data: { effect: AmbientEffect }) => {
      console.log('[Socket] Ambient effect received:', data.effect)
      setAmbientEffect(data.effect)
    })

    return () => {
      socket.emit('leave-campaign')
      socket.off('connect')
      socket.off('disconnect')
      socket.off('connected-players')
      socket.off('player-connected')
      socket.off('player-disconnected')
      socket.off('combat-update')
      socket.off('hp-change')
      socket.off('condition-change')
      socket.off('exhaustion-change')
      socket.off('request-state-sync')
      socket.off('notification')
      socket.off('ambient-effect')
      disconnectSocket()
    }
  }, [campaignId, mode])

  // Convert connected players to Character format for the UI
  // Flatten characters array from each connected player and add grouping metadata
  const displayPlayers: Character[] = mode === 'mj' && connectedPlayers.length > 0
    ? connectedPlayers.flatMap(player =>
        player.characters.map((char, idx) => ({
          id: `p-${char.odNumber}`,
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
    const socket = getSocket()
    socket.emit('combat-update', {
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
    const socket = getSocket()
    socket.emit('combat-update', {
      type: 'stop',
      combatActive: false,
      currentTurn: 0,
      roundNumber: 1,
    })

    toast("Combat terminé")
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
        const socket = getSocket()
        socket.emit('condition-change', {
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
        const socket = getSocket()
        socket.emit('condition-change', {
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
    const socket = getSocket()
    socket.emit('combat-update', {
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
      const socket = getSocket()
      socket.emit('hp-change', {
        participantId: id,
        participantType: 'player',
        newHp,
        change,
        source: mode === 'mj' ? 'dm' : 'player',
      })
    }

    // Update in database
    try {
      await fetch(`/api/campaigns/${campaignId}/characters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: getNumericId(id), current_hp: newHp }),
      })
    } catch (error) {
      console.error('Failed to update character HP:', error)
      toast.error("Erreur de sauvegarde")
    }
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
      const socket = getSocket()
      socket.emit('hp-change', {
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

    // Update in database
    try {
      await fetch(`/api/campaigns/${campaignId}/characters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: getNumericId(id), initiative }),
      })
    } catch (error) {
      console.error('Failed to update character initiative:', error)
      toast.error("Erreur de sauvegarde")
    }
  }

  const updatePlayerConditions = async (id: string, conditions: string[], conditionDurations?: Record<string, number>) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, conditions } : p)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, conditions, conditionDurations } : p))
      )

      // Emit condition change to sync with other clients
      const socket = getSocket()
      socket.emit('condition-change', {
        participantId: id,
        participantType: 'player',
        conditions,
        conditionDurations,
      })
    }

    // Update in database
    try {
      await fetch(`/api/campaigns/${campaignId}/characters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: getNumericId(id), conditions }),
      })
    } catch (error) {
      console.error('Failed to update character conditions:', error)
      toast.error("Erreur de sauvegarde")
    }
  }

  const updatePlayerExhaustion = async (id: string, exhaustionLevel: number) => {
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, exhaustionLevel } : p)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, exhaustionLevel } : p))
      )

      // Emit exhaustion change to sync with other clients
      const socket = getSocket()
      socket.emit('exhaustion-change', {
        participantId: id,
        participantType: 'player',
        exhaustionLevel,
      })
    }

    // Update in database
    try {
      await fetch(`/api/campaigns/${campaignId}/characters`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: getNumericId(id), exhaustion_level: exhaustionLevel }),
      })
    } catch (error) {
      console.error('Failed to update character exhaustion:', error)
      toast.error("Erreur de sauvegarde")
    }
  }

  const updateMonsterConditions = async (id: string, conditions: string[], conditionDurations?: Record<string, number>) => {
    setMonsters((prev) => prev.map((m) => (m.id === id ? { ...m, conditions } : m)))
    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, conditions, conditionDurations } : p))
      )

      // Emit condition change to sync with other clients
      const socket = getSocket()
      socket.emit('condition-change', {
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
      const socket = getSocket()
      socket.emit('exhaustion-change', {
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
    const participant = combatParticipants.find(p => p.id === id)
    setCombatParticipants(prev => prev.filter(p => p.id !== id))
    if (participant) {
      toast(`${participant.name} retiré du combat`)
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
    }))

    setCombatParticipants(prev => {
      const updated = sortParticipantsByInitiative([...prev, ...newParticipants])

      // If combat is active, sync the updated participants to players
      if (combatActive) {
        const socket = getSocket()
        socket.emit('combat-update', {
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
    const socket = getSocket()
    socket.emit('ambient-effect', { effect })
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
      <AmbientEffects effect={ambientEffect} />

      <Header
        mode={mode}
        campaignName={campaignName}
        selectedCharacterName={selectedCharacterNames}
        onHistoryClick={() => setShowHistory(true)}
        onSettingsClick={() => setShowSettings(true)}
        onLogout={() => setUserSelected(false)}
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
                mode={mode}
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
              onAddDbMonsterToCombat={(dbMonster) => addMonstersFromDb(dbMonster, 1)}
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
                    mode={mode}
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
              onAddDbMonsterToCombat={(dbMonster) => addMonstersFromDb(dbMonster, 1)}
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
                    />
                  </div>
                )}

                {/* Center Panel - Combat Setup */}
                <div className={mode === "mj" ? "col-span-6 overflow-auto" : "col-span-12 overflow-auto"}>
                  <CombatSetupPanel
                    onStartCombat={startCombat}
                    onRemoveFromCombat={removeFromCombat}
                    onUpdateParticipantInitiative={updateParticipantInitiative}
                    onRandomizeInitiatives={randomizeInitiatives}
                    onLoadPreset={loadPresetParticipants}
                    mode={mode}
                    campaignId={campaignId}
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
