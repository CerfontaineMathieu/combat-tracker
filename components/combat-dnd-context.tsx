"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import type { Character, Monster, CombatParticipant, DbMonster } from "@/lib/types"

export type DragItemType = "player" | "monster" | "participant" | "dbmonster"

export interface DragItem {
  id: string
  type: DragItemType
  data: Character | Monster | CombatParticipant | DbMonster
}

interface CombatDndContextType {
  combatParticipants: CombatParticipant[]
  setCombatParticipants: React.Dispatch<React.SetStateAction<CombatParticipant[]>>
  activeItem: DragItem | null
  isOverCombatZone: boolean
}

const CombatDndContext = createContext<CombatDndContextType | null>(null)

export function useCombatDnd() {
  const context = useContext(CombatDndContext)
  if (!context) {
    throw new Error("useCombatDnd must be used within CombatDndProvider")
  }
  return context
}

interface CombatDndProviderProps {
  children: React.ReactNode
  players: Character[]
  monsters: Monster[]
  combatParticipants: CombatParticipant[]
  setCombatParticipants: React.Dispatch<React.SetStateAction<CombatParticipant[]>>
  onAddPlayerToCombat: (player: Character) => void
  onAddMonsterToCombat: (monster: Monster) => void
  onAddDbMonsterToCombat?: (dbMonster: DbMonster) => void
  onRemoveFromCombat: (id: string) => void
  onReorderParticipants: (participants: CombatParticipant[]) => void
}

export function CombatDndProvider({
  children,
  players,
  monsters,
  combatParticipants,
  setCombatParticipants,
  onAddPlayerToCombat,
  onAddMonsterToCombat,
  onAddDbMonsterToCombat,
  onRemoveFromCombat,
  onReorderParticipants,
}: CombatDndProviderProps) {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)
  const [isOverCombatZone, setIsOverCombatZone] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const activeId = String(active.id)

    // Determine item type from ID prefix or data
    if (activeId.startsWith("drag-player-")) {
      const playerId = activeId.replace("drag-player-", "")
      const player = players.find(p => p.id === playerId)
      if (player) {
        setActiveItem({ id: playerId, type: "player", data: player })
      }
    } else if (activeId.startsWith("drag-dbmonster-")) {
      // DB monster from the picker panel
      const dbMonster = active.data?.current?.monster as DbMonster | undefined
      if (dbMonster) {
        setActiveItem({ id: String(dbMonster.id), type: "dbmonster", data: dbMonster })
      }
    } else if (activeId.startsWith("drag-monster-")) {
      const monsterId = activeId.replace("drag-monster-", "")
      const monster = monsters.find(m => m.id === monsterId)
      if (monster) {
        setActiveItem({ id: monsterId, type: "monster", data: monster })
      }
    } else if (activeId.startsWith("combat-")) {
      const participantId = activeId.replace("combat-", "")
      const participant = combatParticipants.find(p => p.id === participantId)
      if (participant) {
        setActiveItem({ id: participantId, type: "participant", data: participant })
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event
    setIsOverCombatZone(over?.id === "combat-drop-zone" || String(over?.id).startsWith("combat-"))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    setActiveItem(null)
    setIsOverCombatZone(false)

    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Handle dropping player/monster into combat zone
    if (overId === "combat-drop-zone" || overId.startsWith("combat-")) {
      if (activeId.startsWith("drag-player-")) {
        const playerId = activeId.replace("drag-player-", "")
        const player = players.find(p => p.id === playerId)
        if (player) {
          // Check if player belongs to a group
          if (player.playerSocketId && player.groupSize && player.groupSize > 1) {
            // Add all players from the same group
            const groupPlayers = players.filter(p => p.playerSocketId === player.playerSocketId)
            // Only add players not already in combat
            groupPlayers.forEach(p => {
              if (!combatParticipants.some(cp => cp.id === p.id)) {
                onAddPlayerToCombat(p)
              }
            })
          } else {
            // Single player - add normally
            if (!combatParticipants.some(p => p.id === playerId)) {
              onAddPlayerToCombat(player)
            }
          }
        }
      } else if (activeId.startsWith("drag-dbmonster-")) {
        // DB monster from picker - add 1 instance
        const dbMonster = active.data?.current?.monster as DbMonster | undefined
        if (dbMonster && onAddDbMonsterToCombat) {
          onAddDbMonsterToCombat(dbMonster)
        }
      } else if (activeId.startsWith("drag-monster-")) {
        const monsterId = activeId.replace("drag-monster-", "")
        const monster = monsters.find(m => m.id === monsterId)
        if (monster && !combatParticipants.some(p => p.id === monsterId)) {
          onAddMonsterToCombat(monster)
        }
      }
    }

    // Handle reordering within combat zone
    if (activeId.startsWith("combat-") && overId.startsWith("combat-")) {
      const activeParticipantId = activeId.replace("combat-", "")
      const overParticipantId = overId.replace("combat-", "")

      if (activeParticipantId !== overParticipantId) {
        const oldIndex = combatParticipants.findIndex(p => p.id === activeParticipantId)
        const newIndex = combatParticipants.findIndex(p => p.id === overParticipantId)

        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(combatParticipants, oldIndex, newIndex)
          onReorderParticipants(reordered)
        }
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <CombatDndContext.Provider
        value={{
          combatParticipants,
          setCombatParticipants,
          activeItem,
          isOverCombatZone,
        }}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <DragOverlayItem item={activeItem} />
          )}
        </DragOverlay>
      </CombatDndContext.Provider>
    </DndContext>
  )
}

function DragOverlayItem({ item }: { item: DragItem }) {
  const isPlayer = item.type === "player" || (item.type === "participant" && (item.data as CombatParticipant).type === "player")

  return (
    <div
      className={cn(
        "p-3 rounded-lg border-2 shadow-xl cursor-grabbing",
        "bg-card/95 backdrop-blur-sm",
        isPlayer
          ? "border-gold shadow-gold/20"
          : "border-crimson shadow-crimson/20"
      )}
      style={{ width: "200px" }}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold",
            isPlayer ? "bg-gold/20 text-gold" : "bg-crimson/20 text-crimson"
          )}
        >
          {(item.data as Character | Monster | CombatParticipant).initiative || "?"}
        </div>
        <span className={cn("font-medium", isPlayer ? "text-foreground" : "text-crimson")}>
          {(item.data as Character | Monster | CombatParticipant).name}
        </span>
      </div>
    </div>
  )
}

// Sortable context for combat participants
export function CombatSortableContext({ children }: { children: React.ReactNode }) {
  const { combatParticipants } = useCombatDnd()

  return (
    <SortableContext
      items={combatParticipants.map(p => `combat-${p.id}`)}
      strategy={verticalListSortingStrategy}
    >
      {children}
    </SortableContext>
  )
}
