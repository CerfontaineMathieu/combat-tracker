"use client"

import { useState, useEffect } from "react"
import { useDraggable } from "@dnd-kit/core"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Character, Monster, CombatParticipant } from "@/lib/types"

interface DraggablePlayerCardProps {
  player: Character
  isInCombat: boolean
  compact?: boolean
  onUpdateInitiative?: (initiative: number) => void
}

export function DraggablePlayerCard({ player, isInCombat, compact = false, onUpdateInitiative }: DraggablePlayerCardProps) {
  const [isEditingInit, setIsEditingInit] = useState(false)
  const [initValue, setInitValue] = useState(String(player.initiative ?? ""))

  // Sync local state with prop when it changes
  useEffect(() => {
    if (!isEditingInit) {
      setInitValue(String(player.initiative ?? ""))
    }
  }, [player.initiative, isEditingInit])

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag-player-${player.id}`,
    disabled: isInCombat,
  })

  const handleInitiativeChange = (value: string) => {
    setInitValue(value)
  }

  const handleInitiativeBlur = () => {
    setIsEditingInit(false)
    const newInit = Math.min(30, Math.max(1, parseInt(initValue) || 1))
    setInitValue(String(newInit))
    if (onUpdateInitiative && newInit !== player.initiative) {
      onUpdateInitiative(newInit)
    }
  }

  const handleInitiativeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInitiativeBlur()
    } else if (e.key === "Escape") {
      setIsEditingInit(false)
      setInitValue(String(player.initiative ?? ""))
    }
  }

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative rounded-lg border-2 transition-all select-none touch-none",
        "bg-secondary/60 hover:bg-secondary/80",
        isDragging && "opacity-40",
        isInCombat
          ? "border-gold/30 opacity-50 cursor-not-allowed"
          : "border-transparent hover:border-gold/50 cursor-grab active:cursor-grabbing",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex items-center gap-2">
        {/* Initiative Badge - Clickable to edit */}
        {isEditingInit ? (
          <Input
            type="number"
            min={1}
            max={30}
            value={initValue}
            onChange={(e) => handleInitiativeChange(e.target.value)}
            onBlur={handleInitiativeBlur}
            onKeyDown={handleInitiativeKeyDown}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            autoFocus
            className={cn(
              "text-center font-bold p-0 bg-gold/20 border-gold text-gold",
              compact ? "w-9 h-7 text-xs" : "w-11 h-9 text-sm"
            )}
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (onUpdateInitiative && !isInCombat) {
                setIsEditingInit(true)
              }
            }}
            onPointerDown={(e) => {
              if (onUpdateInitiative && !isInCombat) {
                e.stopPropagation()
              }
            }}
            className={cn(
              "shrink-0 rounded-md flex items-center justify-center font-bold text-background",
              "bg-gold transition-all",
              compact ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm",
              onUpdateInitiative && !isInCombat && "cursor-pointer hover:bg-gold/80 hover:ring-2 hover:ring-offset-2 hover:ring-offset-background hover:ring-gold/50"
            )}
            title={onUpdateInitiative && !isInCombat ? "Cliquez pour modifier l'initiative" : undefined}
          >
            {player.initiative ?? "?"}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("font-medium text-foreground truncate", compact && "text-sm")}>
              {player.name}
            </span>
            {!compact && !isInCombat && (
              <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          {!compact && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {player.class} Niv.{player.level}
              </span>
              <Badge variant="outline" className="text-xs border-gold/30 text-gold px-1.5 py-0">
                CA {player.ac}
              </Badge>
            </div>
          )}
        </div>
      </div>
      {isInCombat && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
          <span className="text-xs text-muted-foreground">Dans le combat</span>
        </div>
      )}
    </div>
  )
}

interface DraggableMonsterCardProps {
  monster: Monster
  isInCombat: boolean
  compact?: boolean
}

export function DraggableMonsterCard({ monster, isInCombat, compact = false }: DraggableMonsterCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag-monster-${monster.id}`,
    disabled: isInCombat,
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group relative rounded-lg border-2 transition-all select-none touch-none",
        "bg-secondary/60 hover:bg-secondary/80",
        isDragging && "opacity-40",
        isInCombat
          ? "border-crimson/30 opacity-50 cursor-not-allowed"
          : "border-transparent hover:border-crimson/50 cursor-grab active:cursor-grabbing",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "shrink-0 rounded-md flex items-center justify-center font-bold text-background",
          "bg-crimson",
          compact ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm"
        )}>
          {monster.initiative || "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={cn("font-medium text-crimson truncate", compact && "text-sm")}>
              {monster.name}
            </span>
            {!compact && !isInCombat && (
              <GripVertical className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </div>
          {!compact && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs border-gold/30 text-gold px-1.5 py-0">
                CA {monster.ac}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {monster.hp}/{monster.maxHp} PV
              </span>
            </div>
          )}
        </div>
      </div>
      {isInCombat && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
          <span className="text-xs text-muted-foreground">Dans le combat</span>
        </div>
      )}
    </div>
  )
}

interface SortableParticipantCardProps {
  participant: CombatParticipant
  onRemove: () => void
  onUpdateInitiative?: (initiative: number) => void
  index: number
  mode?: "mj" | "joueur"
}

export function SortableParticipantCard({ participant, onRemove, onUpdateInitiative, index, mode = "mj" }: SortableParticipantCardProps) {
  const [isEditingInit, setIsEditingInit] = useState(false)
  const [initValue, setInitValue] = useState(String(participant.initiative))

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `combat-${participant.id}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isPlayer = participant.type === "player"

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return "bg-emerald"
    if (ratio > 0.25) return "bg-gold"
    return "bg-crimson"
  }

  const handleInitiativeChange = (value: string) => {
    setInitValue(value)
  }

  const handleInitiativeBlur = () => {
    setIsEditingInit(false)
    const newInit = Math.min(30, Math.max(1, parseInt(initValue) || 1))
    setInitValue(String(newInit))
    if (onUpdateInitiative && newInit !== participant.initiative) {
      onUpdateInitiative(newInit)
    }
  }

  const handleInitiativeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInitiativeBlur()
    } else if (e.key === "Escape") {
      setIsEditingInit(false)
      setInitValue(String(participant.initiative))
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative p-3 rounded-lg border-2 transition-all",
        "bg-secondary/60 hover:bg-secondary/80",
        isDragging
          ? "opacity-80 shadow-lg z-10 scale-[1.02]"
          : "opacity-100",
        isPlayer
          ? "border-gold/40 hover:border-gold/60"
          : "border-crimson/40 hover:border-crimson/60"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 rounded hover:bg-muted/50"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Initiative Badge - Clickable to edit */}
        {isEditingInit ? (
          <Input
            type="number"
            min={1}
            max={30}
            value={initValue}
            onChange={(e) => handleInitiativeChange(e.target.value)}
            onBlur={handleInitiativeBlur}
            onKeyDown={handleInitiativeKeyDown}
            autoFocus
            className={cn(
              "w-12 h-10 text-center font-bold text-sm p-0",
              isPlayer
                ? "bg-gold/20 border-gold text-gold"
                : "bg-crimson/20 border-crimson text-crimson"
            )}
          />
        ) : (
          <button
            onClick={() => onUpdateInitiative && setIsEditingInit(true)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-all",
              isPlayer
                ? "bg-gold text-background hover:bg-gold/80"
                : "bg-crimson text-white hover:bg-crimson/80",
              onUpdateInitiative && "cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-offset-background",
              onUpdateInitiative && (isPlayer ? "hover:ring-gold/50" : "hover:ring-crimson/50")
            )}
            title="Cliquez pour modifier l'initiative"
          >
            {participant.initiative}
          </button>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">#{index + 1}</span>
            <h3 className={cn(
              "font-semibold truncate",
              isPlayer ? "text-foreground" : "text-crimson"
            )}>
              {participant.name}
            </h3>
            {!isPlayer && (
              <Badge variant="outline" className="text-xs border-crimson/30 text-crimson px-1.5 py-0">
                Monstre
              </Badge>
            )}
          </div>

          {/* HP Bar - Only visible for DM */}
          {mode === "mj" && (
            <div className="mt-1.5">
              <div className="flex justify-between text-xs mb-0.5">
                <span className="text-muted-foreground">PV</span>
                <span className={cn(
                  participant.currentHp <= participant.maxHp * 0.25 && "text-crimson font-semibold"
                )}>
                  {participant.currentHp} / {participant.maxHp}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full transition-all duration-300 ease-out",
                    getHpColor(participant.currentHp, participant.maxHp)
                  )}
                  style={{
                    width: `${Math.max(0, (participant.currentHp / participant.maxHp) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-crimson hover:bg-crimson/10 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
