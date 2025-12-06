"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
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
import type { Character, Monster, CombatParticipant, DbMonster, CharacterInventory } from "@/lib/types"
import { DEFAULT_INVENTORY } from "@/lib/types"
import { AmbientEffects, type AmbientEffect } from "@/components/ambient-effects"
import { DmDisconnectOverlay } from "@/components/dm-disconnect-overlay"
import { XpSummaryModal } from "@/components/xp-summary-modal"
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
    emitDeathSaveChange,
    emitInventoryUpdate,
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

  // Load HP from database for a character (returns null if not persisted)
  const loadCharacterHp = async (characterId: string): Promise<number | null> => {
    try {
      const response = await fetch(`/api/characters/${characterId}/hp`)
      if (response.ok) {
        const data = await response.json()
        if (data.currentHp !== null) {
          console.log('[HP] Loaded from database:', characterId, data.currentHp)
          return data.currentHp
        }
      }
    } catch (error) {
      console.error('Failed to load HP for character:', characterId, error)
    }
    return null
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

  // Load status (conditions + exhaustion) from database for a character
  const loadCharacterStatus = async (characterId: string): Promise<{ conditions: string[] | null; exhaustionLevel: number | null }> => {
    try {
      const response = await fetch(`/api/characters/${characterId}/status`)
      if (response.ok) {
        const data = await response.json()
        if (data.conditions !== null || data.exhaustionLevel !== null) {
          console.log('[Status] Loaded from database:', characterId, data)
          return data
        }
      }
    } catch (error) {
      console.error('Failed to load status for character:', characterId, error)
    }
    return { conditions: null, exhaustionLevel: null }
  }

  // Handle players selection (multiple characters)
  const handleSelectPlayers = async (characters: SelectedCharacters) => {
    setMode("joueur")
    setSelectedCharacters(characters)
    setUserSelected(true)
    // Persist mode and characters to localStorage
    localStorage.setItem("combatTrackerMode", "joueur")
    if (characters.length > 0) {
      // Load inventories from database for each character
      const charactersWithInventories = await Promise.all(
        characters.map(async (char) => {
          const inventory = await loadCharacterInventory(char.id)
          return {
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
            inventory,
          }
        })
      )

      localStorage.setItem("combatTrackerCharacters", JSON.stringify(charactersWithInventories))
      // Also keep in sessionStorage for backward compatibility
      sessionStorage.setItem("selectedCharacters", JSON.stringify(charactersWithInventories))
      // Join campaign as player with characters
      if (socketState.isConnected) {
        console.log('[Socket] User selected player with characters:', charactersWithInventories.map(c => c.name).join(', '))
        joinCampaign({ role: 'player', characters: charactersWithInventories })
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
            }) => {
              // Load persisted data from database in parallel
              const [inventory, persistedHp, persistedStatus] = await Promise.all([
                loadCharacterInventory(c.id),
                loadCharacterHp(c.id),
                loadCharacterStatus(c.id),
              ])
              return {
                id: c.id,
                name: c.name,
                class: c.class,
                level: c.level,
                // Use persisted HP if available, otherwise use Notion HP
                currentHp: persistedHp ?? c.current_hp,
                maxHp: c.max_hp,
                ac: c.ac,
                initiative: c.initiative,
                // Use persisted conditions/exhaustion if available
                conditions: persistedStatus.conditions ?? c.conditions ?? [],
                exhaustionLevel: persistedStatus.exhaustionLevel ?? 0,
                isConnected: false,
                inventory,
                passivePerception: c.passive_perception,
                strength: c.strength,
                dexterity: c.dexterity,
                constitution: c.constitution,
                intelligence: c.intelligence,
                wisdom: c.wisdom,
                charisma: c.charisma,
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
  const displayPlayers: Character[] = (() => {
    // Get connected character IDs and their data
    const connectedCharacterIds = new Set<string>()
    const connectedCharactersMap = new Map<string, Character>()

    socketState.connectedPlayers.forEach(player => {
      player.characters.forEach((char, idx) => {
        const id = String(char.odNumber)
        connectedCharacterIds.add(id)
        // Get static data from campaign characters (includes stats from Notion)
        const campaignChar = allCampaignCharacters.find(c => c.id === id)
        // Get local player state for conditions/exhaustion (DM may have updated them)
        const localPlayer = players.find(p => p.id === id)
        // Check combat participants for conditions (they persist in Redis across refresh)
        const combatParticipant = socketState.combatState.participants.find(
          p => p.id === id && p.type === 'player'
        )
        connectedCharactersMap.set(id, {
          id,
          name: char.name,
          class: char.class,
          level: char.level,
          currentHp: char.currentHp,
          maxHp: char.maxHp,
          ac: char.ac,
          // Use initiative override if set, otherwise use character's initiative
          initiative: playerInitiatives[id] ?? char.initiative,
          // CRITICAL: Prefer combat participant conditions (source of truth during combat)
          conditions: (combatParticipant?.conditions?.length ?? 0) > 0
            ? combatParticipant.conditions
            : (localPlayer?.conditions?.length ?? 0) > 0
              ? localPlayer.conditions
              : char.conditions ?? [],
          exhaustionLevel: combatParticipant?.exhaustionLevel ?? localPlayer?.exhaustionLevel ?? char.exhaustionLevel ?? 0,
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
        })
      })
    })

    // Merge with all campaign characters
    const allPlayers: Character[] = allCampaignCharacters.map(char => {
      // If connected, use real-time data
      if (connectedCharacterIds.has(char.id)) {
        const connectedChar = connectedCharactersMap.get(char.id)!
        // Merge with local player state to preserve HP and inventory updates
        const localPlayer = players.find(p => p.id === char.id)
        return {
          ...connectedChar,
          // CRITICAL: Use local HP if player is in local state (DM may have updated it)
          currentHp: localPlayer ? localPlayer.currentHp : connectedChar.currentHp,
          // CRITICAL: Use local inventory if player is in local state (it has the latest changes)
          inventory: localPlayer ? localPlayer.inventory : connectedChar.inventory,
        }
      }
      // Otherwise, use static data with isConnected: false
      // Apply initiative override if set
      // CRITICAL: Also check players state and combat participants for updates (DM may have updated them)
      const localPlayer = players.find(p => p.id === char.id)
      // Check combat participants for conditions (they persist in Redis across refresh)
      const combatParticipant = socketState.combatState.participants.find(
        p => p.id === char.id && p.type === 'player'
      )
      // Determine conditions: prefer combat participant (source of truth during combat), then local, then char
      const conditions = (combatParticipant?.conditions?.length ?? 0) > 0
        ? combatParticipant.conditions
        : (localPlayer?.conditions?.length ?? 0) > 0
          ? localPlayer.conditions
          : char.conditions ?? []
      const exhaustionLevel = combatParticipant?.exhaustionLevel ?? localPlayer?.exhaustionLevel ?? char.exhaustionLevel ?? 0

      return {
        ...char,
        isConnected: false,
        initiative: playerInitiatives[char.id] ?? char.initiative,
        currentHp: localPlayer?.currentHp ?? combatParticipant?.currentHp ?? char.currentHp,
        conditions,
        exhaustionLevel,
        inventory: localPlayer?.inventory || char.inventory,
      }
    })

    // Sort: connected first, then by name
    return allPlayers.sort((a, b) => {
      if (a.isConnected && !b.isConnected) return -1
      if (!a.isConnected && b.isConnected) return 1
      return a.name.localeCompare(b.name)
    })
  })()

  // Memoize connected player IDs to avoid infinite loops
  const connectedPlayerIds = useMemo(() => {
    return new Set(displayPlayers.filter(p => p.isConnected).map(p => p.id))
  }, [displayPlayers.map(p => `${p.id}:${p.isConnected}`).join(',')])

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

  // Show XP summary modal before ending combat
  const stopCombat = () => {
    // Calculate XP from all monsters that are dead (HP = 0)
    const deadMonsters = combatParticipants
      .filter(p => p.type === "monster" && p.currentHp <= 0)
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

  const updatePlayerHp = async (id: string, change: number) => {
    // Look in displayPlayers which has the merged data from socket and campaign
    const player = displayPlayers.find(p => p.id === id)
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
    setPlayers((prev) => {
      const exists = prev.some(p => p.id === id)
      if (exists) {
        return prev.map((p) => (p.id === id ? { ...p, currentHp: newHp } : p))
      } else {
        // Add player to state with updated HP (player was not in local state yet)
        return [...prev, { ...player, currentHp: newHp }]
      }
    })

    // Always emit HP change to sync with other clients (including socket state)
    emitHpChange({
      participantId: id,
      participantType: 'player',
      newHp,
      change,
      source: mode === 'mj' ? 'dm' : 'player',
    })

    if (combatActive) {
      setCombatParticipants((prev) =>
        prev.map((p) => (p.id === id ? { ...p, currentHp: newHp } : p)),
      )

      // Reset death saves when healed from 0 HP
      if (wasAtZeroHp && newHp > 0) {
        updateDeathSaves(id, 'player', { successes: 0, failures: 0 }, false, false)
      }
    }

    // Persist HP to database for session persistence
    try {
      await fetch(`/api/characters/${id}/hp`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentHp: newHp }),
      })
    } catch (error) {
      console.error('Failed to persist HP:', error)
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
    // Store initiative override (session-only, not persisted)
    setPlayerInitiatives(prev => ({ ...prev, [id]: initiative }))
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

    // Persist conditions to database for session persistence
    try {
      await fetch(`/api/characters/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conditions }),
      })
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

      // Emit exhaustion change to sync with other clients
      emitExhaustionChange({
        participantId: id,
        participantType: 'player',
        exhaustionLevel,
      })
    }

    // Persist exhaustion to database for session persistence
    try {
      await fetch(`/api/characters/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exhaustionLevel }),
      })
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
      // Use current HP (persisted in session) instead of resetting to max
      currentHp: player.currentHp,
      maxHp: player.maxHp,
      conditions: player.conditions || [],  // Keep current conditions
      exhaustionLevel: player.exhaustionLevel || 0,  // Keep current exhaustion
      type: "player",
      level: player.level,  // For difficulty calculation (2024 rules)
      isConnected: player.isConnected,
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
      conditions: monster.conditions || [],
      exhaustionLevel: monster.exhaustionLevel || 0,
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

  // Add session monsters to combat with quantity (for mobile tap-to-add)
  const addSessionMonstersToCombat = (monster: Monster, quantity: number) => {
    const newParticipants: CombatParticipant[] = Array.from({ length: quantity }, (_, i) => ({
      id: `session-${monster.id}-${Date.now()}-${i}`,
      name: quantity > 1 ? `${monster.name} ${i + 1}` : monster.name,
      initiative: Math.floor(Math.random() * 20) + 1,
      currentHp: monster.hp,
      maxHp: monster.maxHp,
      conditions: monster.conditions || [],
      exhaustionLevel: monster.exhaustionLevel || 0,
      type: "monster",
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
    setCombatParticipants(prev =>
      prev.map(p => p.id === id ? { ...p, name } : p)
    )
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

      {/* DM Disconnect Overlay - Show for players when DM is disconnected */}
      {socketState.dmDisconnected && mode === 'joueur' && socketState.dmDisconnectTime && (
        <DmDisconnectOverlay
          disconnectTime={socketState.dmDisconnectTime}
          gracePeriodSeconds={60}
          onTimeout={() => {
            // Return to user selection
            leaveCampaign()
            setUserSelected(false)
            localStorage.removeItem("combatTrackerMode")
            localStorage.removeItem("combatTrackerCharacters")
          }}
        />
      )}

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
      />

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
                  onUpdateInventory={updatePlayerInventory}
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
                  onUpdateConditions={mode === "mj" ? (id, conditions, type, conditionDurations) => {
                    if (type === "player") updatePlayerConditions(id, conditions, conditionDurations)
                    else updateMonsterConditions(id, conditions, conditionDurations)
                  } : undefined}
                  onUpdateExhaustion={mode === "mj" ? (id, level, type) => {
                    if (type === "player") updatePlayerExhaustion(id, level)
                    else updateMonsterExhaustion(id, level)
                  } : undefined}
                  onUpdateDeathSaves={mode === "mj" ? updateDeathSaves : undefined}
                  onUpdateName={mode === "mj" ? updateParticipantName : undefined}
                  onRemoveFromCombat={mode === "mj" ? removeFromCombat : undefined}
                  mode={mode}
                  ownCharacterIds={selectedCharacters.map(c => String(c.id))}
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
                  <div className="col-span-3 overflow-auto">
                    <PlayerPanel
                      players={displayPlayers}
                      onUpdateHp={updatePlayerHp}
                      onUpdateInitiative={updatePlayerInitiative}
                      onUpdateConditions={updatePlayerConditions}
                      onUpdateExhaustion={updatePlayerExhaustion}
                      onUpdateInventory={updatePlayerInventory}
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
                  <div className="col-span-3 overflow-auto">
                    <MyCharactersPanel
                      characters={displayPlayers.filter(p => selectedCharacters.some(sc => String(sc.id) === p.id))}
                      onUpdateHp={updatePlayerHp}
                      onUpdateInventory={updatePlayerInventory}
                      combatActive={combatActive}
                    />
                  </div>
                )}

                {/* Center Panel - Combat (9 cols for players with side panel, 6 cols for MJ) */}
                <div className={mode === "mj" ? "col-span-6 overflow-auto" : "col-span-9 overflow-auto"}>
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
                    onUpdateName={mode === "mj" ? updateParticipantName : undefined}
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
                      refreshKey={monsterRefreshKey}
                    />
                  </div>
                )}
              </div>
            </CombatDndProvider>
          ) : mode === "joueur" ? (
            /* Player waiting screen - show MyCharactersPanel with waiting message */
            <div className="grid grid-cols-12 gap-4 h-full">
              <div className="col-span-4 overflow-auto">
                <MyCharactersPanel
                  characters={displayPlayers.filter(p => selectedCharacters.some(sc => String(sc.id) === p.id))}
                  onUpdateHp={updatePlayerHp}
                  onUpdateInventory={updatePlayerInventory}
                  combatActive={false}
                />
              </div>
              <div className="col-span-8 flex items-center justify-center">
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
                  <div className="col-span-3 overflow-auto">
                    <PlayerPanel
                      players={displayPlayers}
                      onUpdateHp={updatePlayerHp}
                      onUpdateInitiative={updatePlayerInitiative}
                      onUpdateConditions={updatePlayerConditions}
                      onUpdateExhaustion={updatePlayerExhaustion}
                      onUpdateInventory={updatePlayerInventory}
                      mode={mode}
                      combatActive={combatActive}
                      combatParticipants={combatParticipants}
                      ownCharacterIds={selectedCharacters.map(c => String(c.id))}
                      onAddToCombat={addPlayerToCombat}
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
                  <div className="col-span-3 overflow-auto">
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
