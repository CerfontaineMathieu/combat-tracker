"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Swords, Play, Square, SkipForward, Minus, Plus, Crown, Zap, X, Trash2, Skull, Heart, Check, XCircle, HeartPulse } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { CombatParticipant } from "@/lib/types"
import { ConditionList } from "@/components/condition-badge"
import { ConditionManager } from "@/components/condition-manager"

const QUICK_HP_VALUES = [1, 3, 5, 10]

interface CombatPanelProps {
  participants: CombatParticipant[]
  combatActive: boolean
  currentTurn: number
  roundNumber: number
  onStartCombat?: () => void
  onStopCombat?: () => void
  onNextTurn?: () => void
  onClearCombat?: () => void
  onUpdateHp?: (id: string, change: number, type: "player" | "monster") => void
  onUpdateConditions?: (id: string, conditions: string[], type: "player" | "monster", conditionDurations?: Record<string, number>) => void
  onUpdateExhaustion?: (id: string, level: number, type: "player" | "monster") => void
  onUpdateDeathSaves?: (id: string, type: "player" | "monster", deathSaves: { successes: number; failures: number }, isStabilized: boolean, isDead: boolean) => void
  onUpdateName?: (id: string, name: string) => void
  onRemoveFromCombat?: (id: string) => void
  mode: "mj" | "joueur"
  ownCharacterIds?: string[] // IDs of characters owned by the current player
}

export function CombatPanel({
  participants,
  combatActive,
  currentTurn,
  roundNumber,
  onStartCombat,
  onStopCombat,
  onNextTurn,
  onClearCombat,
  onUpdateHp,
  onUpdateConditions,
  onUpdateExhaustion,
  onUpdateDeathSaves,
  onUpdateName,
  onRemoveFromCombat,
  mode,
  ownCharacterIds = [],
}: CombatPanelProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<CombatParticipant | null>(null)
  const [hpAmount, setHpAmount] = useState("")
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = useState("")

  // Calculate total XP from all monsters in combat (MJ only)
  const totalXp = participants
    .filter(p => p.type === "monster")
    .reduce((sum, p) => sum + (p.xp || 0), 0)

  // Droppable zone for adding monsters during combat
  const { setNodeRef, isOver } = useDroppable({
    id: "combat-drop-zone",
  })

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return "bg-emerald"
    if (ratio > 0.25) return "bg-gold"
    return "bg-crimson"
  }

  const handleDamage = () => {
    if (selectedParticipant && hpAmount && onUpdateHp) {
      onUpdateHp(selectedParticipant.id, -Math.abs(Number.parseInt(hpAmount)), selectedParticipant.type)
      setHpAmount("")
      setSelectedParticipant(null)
    }
  }

  const handleHeal = () => {
    if (selectedParticipant && hpAmount && onUpdateHp) {
      onUpdateHp(selectedParticipant.id, Math.abs(Number.parseInt(hpAmount)), selectedParticipant.type)
      setHpAmount("")
      setSelectedParticipant(null)
    }
  }

  const handleStartEditingName = (participant: CombatParticipant) => {
    setEditingNameId(participant.id)
    setEditingNameValue(participant.name)
  }

  const handleNameBlur = (participantId: string, originalName: string) => {
    setEditingNameId(null)
    const trimmedName = editingNameValue.trim()
    if (trimmedName && trimmedName !== originalName && onUpdateName) {
      onUpdateName(participantId, trimmedName)
    }
    setEditingNameValue("")
  }

  const handleNameKeyDown = (e: React.KeyboardEvent, participantId: string, originalName: string) => {
    if (e.key === "Enter") {
      handleNameBlur(participantId, originalName)
    } else if (e.key === "Escape") {
      setEditingNameId(null)
      setEditingNameValue("")
    }
  }

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gold">
            <Swords className="w-5 h-5" />
            Suivi de Combat
          </CardTitle>
          <div className="flex items-center gap-2">
            {mode === "mj" && totalXp > 0 && (
              <Badge variant="secondary" className="bg-gold/20 text-gold border-gold/30">
                XP: {totalXp.toLocaleString()}
              </Badge>
            )}
            {combatActive && (
              <Badge className="bg-crimson/20 text-crimson border-crimson/30 animate-pulse">
                Round {roundNumber}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Combat Controls */}
        {mode === "mj" && (
          <div className="flex gap-2 mb-4 shrink-0">
            {!combatActive ? (
              <Button
                onClick={onStartCombat}
                className="flex-1 min-h-[48px] bg-emerald hover:bg-emerald/80 text-background active:scale-95 transition-smooth"
              >
                <Play className="w-5 h-5 mr-2" />
                Commencer le combat
              </Button>
            ) : (
              <>
                <Button
                  onClick={onStopCombat}
                  variant="destructive"
                  className="flex-1 min-h-[48px] bg-crimson hover:bg-crimson/80 active:scale-95 transition-smooth"
                >
                  <Square className="w-5 h-5 mr-2" />
                  Arrêter
                </Button>
                <Button
                  onClick={onNextTurn}
                  className="flex-1 min-h-[48px] bg-primary hover:bg-primary/80 active:scale-95 transition-smooth"
                >
                  <SkipForward className="w-5 h-5 mr-2" />
                  Tour suivant
                </Button>
                {onClearCombat && participants.length > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-h-[48px] border-crimson/30 hover:border-crimson hover:bg-crimson/10 text-crimson active:scale-95 transition-smooth"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-crimson">Vider le combat ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprimera tous les monstres et joueurs du combat.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onClearCombat}
                          className="bg-crimson hover:bg-crimson/80"
                        >
                          Vider
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        )}

        {/* Initiative List */}
        {combatActive ? (
          <div
            ref={setNodeRef}
            className={cn(
              "flex-1 overflow-hidden rounded-lg transition-all",
              isOver && "ring-2 ring-crimson ring-offset-2 ring-offset-background"
            )}
          >
            <ScrollArea className="h-full">
              <div className="space-y-2 pr-2">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className={cn(
                    "p-[var(--card-padding-mobile)] md:p-3 rounded-lg border transition-all",
                    index === currentTurn
                      ? "bg-gold/10 border-gold shadow-lg shadow-gold/10 animate-pulse-gold"
                      : "bg-secondary/30 border-border/50 hover:bg-secondary/50",
                    participant.currentHp === 0 && "opacity-50",
                    index === 0 && "animate-fade-in"
                  )}
                >
                  {/* Mobile: Two-row layout for guaranteed fit */}
                  <div className="flex flex-col gap-1.5 md:hidden">
                    {/* Row 1: Initiative + Name + Crown */}
                    <div className="flex items-center gap-2">
                      {/* Initiative Badge */}
                      <div
                        className={cn(
                          "h-[var(--btn-size-mobile)] w-[var(--btn-size-mobile)] rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-smooth",
                          index === currentTurn
                            ? participant.type === "monster"
                              ? "bg-crimson text-white"
                              : "bg-gold text-background"
                            : participant.type === "monster"
                              ? "bg-crimson/60 text-white"
                              : "bg-gold/60 text-background"
                        )}
                      >
                        {participant.initiative}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        {editingNameId === participant.id ? (
                          <Input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onBlur={() => handleNameBlur(participant.id, participant.name)}
                            onKeyDown={(e) => handleNameKeyDown(e, participant.id, participant.name)}
                            autoFocus
                            className="h-7 text-sm font-semibold px-2 bg-crimson/20 border-crimson text-crimson"
                          />
                        ) : (
                          <h3
                            onClick={() => mode === "mj" && participant.type === "monster" && onUpdateName && handleStartEditingName(participant)}
                            className={cn(
                              "font-semibold truncate",
                              participant.type === "monster" ? "text-crimson" : "text-foreground",
                              mode === "mj" && participant.type === "monster" && onUpdateName && "cursor-pointer hover:underline hover:decoration-dotted"
                            )}
                            title={mode === "mj" && participant.type === "monster" && onUpdateName ? "Cliquez pour renommer" : undefined}
                          >
                            {participant.name}
                          </h3>
                        )}
                      </div>

                      {/* Crown for current turn */}
                      {index === currentTurn && (
                        <Crown className="w-5 h-5 text-gold shrink-0 animate-bounce" />
                      )}
                    </div>

                    {/* Conditions display */}
                    {(participant.conditions.length > 0 || participant.exhaustionLevel > 0) && (
                      <div>
                        <ConditionList
                          conditions={participant.conditions}
                          conditionDurations={participant.conditionDurations}
                          exhaustionLevel={participant.exhaustionLevel}
                          showLabels={false}
                          size="sm"
                        />
                      </div>
                    )}

                    {/* Row 2: HP Bar + Action Buttons */}
                    {(mode === "mj" || ownCharacterIds.includes(participant.id)) && (
                      <div className="flex items-center gap-2">
                        {/* HP Bar */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-muted-foreground">PV</span>
                            <span
                              className={cn(
                                participant.currentHp <= participant.maxHp * 0.25 &&
                                  "text-crimson font-semibold"
                              )}
                            >
                              {participant.currentHp} / {participant.maxHp}
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-500 ease-out",
                                getHpColor(participant.currentHp, participant.maxHp)
                              )}
                              style={{
                                width: `${Math.max(0, (participant.currentHp / participant.maxHp) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons - always visible */}
                        {mode === "mj" && (
                          <div className="flex items-center gap-1 shrink-0">
                            {onRemoveFromCombat && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-[var(--btn-size-mobile)] w-[var(--btn-size-mobile)] text-muted-foreground hover:text-crimson hover:bg-crimson/10 transition-smooth"
                                onClick={() => onRemoveFromCombat(participant.id)}
                              >
                                <X className="w-5 h-5" />
                              </Button>
                            )}
                            {onUpdateConditions && onUpdateExhaustion && (
                              <ConditionManager
                                targetName={participant.name}
                                currentConditions={participant.conditions}
                                conditionDurations={participant.conditionDurations}
                                exhaustionLevel={participant.exhaustionLevel}
                                onToggleCondition={(conditionId, duration) => {
                                  const isRemoving = participant.conditions.includes(conditionId)
                                  const newConditions = isRemoving
                                    ? participant.conditions.filter(c => c !== conditionId)
                                    : [...participant.conditions, conditionId]
                                  const newDurations = { ...(participant.conditionDurations || {}) }
                                  if (isRemoving) {
                                    delete newDurations[conditionId]
                                  } else if (duration) {
                                    newDurations[conditionId] = duration
                                  }
                                  onUpdateConditions(participant.id, newConditions, participant.type, newDurations)
                                }}
                                onSetExhaustion={(level) => {
                                  onUpdateExhaustion(participant.id, level, participant.type)
                                }}
                                trigger={
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-[var(--btn-size-mobile)] w-[var(--btn-size-mobile)] border-border hover:border-purple-500 hover:text-purple-500 bg-transparent transition-smooth"
                                  >
                                    <Zap className="w-5 h-5" />
                                  </Button>
                                }
                              />
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  className="h-[var(--btn-size-mobile)] w-[var(--btn-size-mobile)] border-border hover:border-gold hover:text-gold bg-transparent transition-smooth font-semibold text-xs"
                                  onClick={() => setSelectedParticipant(participant)}
                                >
                                  PV
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)]">
                                <DialogHeader>
                                  <DialogTitle className="text-gold">{participant.name}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <Button
                                    className="w-full min-h-[40px] bg-emerald/20 hover:bg-emerald/30 text-emerald border border-emerald/30 active:scale-95"
                                    onClick={() => {
                                      const hpToRestore = participant.maxHp - participant.currentHp
                                      if (hpToRestore > 0) onUpdateHp?.(participant.id, hpToRestore, participant.type)
                                    }}
                                    disabled={participant.currentHp >= participant.maxHp}
                                  >
                                    <HeartPulse className="w-4 h-4 mr-2" />
                                    Vie complète
                                  </Button>
                                  <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">
                                      Raccourcis rapides
                                    </label>
                                    <div className="grid grid-cols-4 gap-1 mb-1">
                                      {QUICK_HP_VALUES.map((value) => (
                                        <Button
                                          key={`damage-${value}`}
                                          variant="outline"
                                          size="sm"
                                          className="h-10 text-crimson border-crimson/30 hover:bg-crimson/10 hover:border-crimson/50 active:scale-95"
                                          onClick={() => onUpdateHp?.(participant.id, -value, participant.type)}
                                        >
                                          -{value}
                                        </Button>
                                      ))}
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                      {QUICK_HP_VALUES.map((value) => (
                                        <Button
                                          key={`heal-${value}`}
                                          variant="outline"
                                          size="sm"
                                          className="h-10 text-emerald border-emerald/30 hover:bg-emerald/10 hover:border-emerald/50 active:scale-95"
                                          onClick={() => onUpdateHp?.(participant.id, value, participant.type)}
                                        >
                                          +{value}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-sm text-muted-foreground mb-2 block">
                                      Montant personnalisé
                                    </label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="number"
                                        value={hpAmount}
                                        onChange={(e) => setHpAmount(e.target.value)}
                                        placeholder="Autre..."
                                        className="bg-background min-h-[44px]"
                                      />
                                      <Button
                                        onClick={handleDamage}
                                        disabled={!hpAmount}
                                        size="icon"
                                        className="shrink-0 h-11 w-11 bg-crimson hover:bg-crimson/80 active:scale-95 disabled:opacity-50"
                                      >
                                        <Minus className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        onClick={handleHeal}
                                        disabled={!hpAmount}
                                        size="icon"
                                        className="shrink-0 h-11 w-11 bg-emerald hover:bg-emerald/80 text-background active:scale-95 disabled:opacity-50"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Death Saving Throws - MJ view (mobile) */}
                    {mode === "mj" && participant.type === "player" && participant.currentHp === 0 && !participant.isDead && !participant.isStabilized && onUpdateDeathSaves && (
                      <div className="p-2 bg-crimson/10 rounded-lg border border-crimson/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Skull className="w-4 h-4 text-crimson" />
                          <span className="text-xs font-medium text-crimson">Jets de sauvegarde</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-emerald mr-1">✓</span>
                            {[0, 1, 2].map((i) => (
                              <button
                                key={`success-${i}`}
                                onClick={() => {
                                  const currentSuccesses = participant.deathSaves?.successes ?? 0
                                  const newSuccesses = i < currentSuccesses ? i : i + 1
                                  const isStabilized = newSuccesses >= 3
                                  onUpdateDeathSaves(
                                    participant.id,
                                    participant.type,
                                    { successes: Math.min(3, newSuccesses), failures: participant.deathSaves?.failures ?? 0 },
                                    isStabilized,
                                    false
                                  )
                                }}
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 transition-all",
                                  i < (participant.deathSaves?.successes ?? 0)
                                    ? "bg-emerald border-emerald"
                                    : "border-emerald/50 hover:border-emerald"
                                )}
                              >
                                {i < (participant.deathSaves?.successes ?? 0) && (
                                  <Check className="w-3 h-3 text-background mx-auto" />
                                )}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-crimson mr-1">✗</span>
                            {[0, 1, 2].map((i) => (
                              <button
                                key={`failure-${i}`}
                                onClick={() => {
                                  const currentFailures = participant.deathSaves?.failures ?? 0
                                  const newFailures = i < currentFailures ? i : i + 1
                                  const isDead = newFailures >= 3
                                  onUpdateDeathSaves(
                                    participant.id,
                                    participant.type,
                                    { successes: participant.deathSaves?.successes ?? 0, failures: Math.min(3, newFailures) },
                                    participant.isStabilized ?? false,
                                    isDead
                                  )
                                }}
                                className={cn(
                                  "w-5 h-5 rounded-full border-2 transition-all",
                                  i < (participant.deathSaves?.failures ?? 0)
                                    ? "bg-crimson border-crimson"
                                    : "border-crimson/50 hover:border-crimson"
                                )}
                              >
                                {i < (participant.deathSaves?.failures ?? 0) && (
                                  <XCircle className="w-3 h-3 text-background mx-auto" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status indicators (mobile) */}
                    {participant.isDead && (
                      <div className="flex items-center gap-2 text-crimson">
                        <Skull className="w-4 h-4" />
                        <span className="text-xs font-medium">Mort</span>
                      </div>
                    )}
                    {participant.isStabilized && participant.currentHp === 0 && !participant.isDead && (
                      <div className="flex items-center gap-2 text-gold">
                        <Heart className="w-4 h-4" />
                        <span className="text-xs font-medium">Stabilisé</span>
                      </div>
                    )}
                    {mode === "joueur" && participant.type === "player" && participant.currentHp === 0 && !participant.isDead && !participant.isStabilized && (
                      <Badge className="bg-crimson/20 text-crimson border-crimson/30 w-fit">
                        Mourant
                      </Badge>
                    )}
                  </div>

                  {/* Desktop: Original layout */}
                  <div className="hidden md:flex items-center gap-3">
                    {/* Initiative Badge */}
                    <div
                      className={cn(
                        "w-11 h-11 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 transition-smooth",
                        index === currentTurn
                          ? participant.type === "monster"
                            ? "bg-crimson text-white"
                            : "bg-gold text-background"
                          : participant.type === "monster"
                            ? "bg-crimson/60 text-white"
                            : "bg-gold/60 text-background"
                      )}
                    >
                      {participant.initiative}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap">
                        {editingNameId === participant.id ? (
                          <Input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onBlur={() => handleNameBlur(participant.id, participant.name)}
                            onKeyDown={(e) => handleNameKeyDown(e, participant.id, participant.name)}
                            autoFocus
                            className="h-7 text-sm font-semibold px-2 bg-crimson/20 border-crimson text-crimson max-w-[200px]"
                          />
                        ) : (
                          <h3
                            onClick={() => mode === "mj" && participant.type === "monster" && onUpdateName && handleStartEditingName(participant)}
                            className={cn(
                              "font-semibold truncate",
                              participant.type === "monster" ? "text-crimson" : "text-foreground",
                              mode === "mj" && participant.type === "monster" && onUpdateName && "cursor-pointer hover:underline hover:decoration-dotted"
                            )}
                            title={mode === "mj" && participant.type === "monster" && onUpdateName ? "Cliquez pour renommer" : undefined}
                          >
                            {participant.name}
                          </h3>
                        )}
                        {index === currentTurn && (
                          <Crown className="w-4 h-4 text-gold flex-shrink-0 animate-bounce" />
                        )}
                        {participant.type === "monster" && (
                          <Badge variant="outline" className="text-xs border-crimson/50 text-crimson shrink-0">
                            Monstre
                          </Badge>
                        )}
                      </div>

                      {/* Conditions display */}
                      {(participant.conditions.length > 0 || participant.exhaustionLevel > 0) && (
                        <div className="mt-1">
                          <ConditionList
                            conditions={participant.conditions}
                            conditionDurations={participant.conditionDurations}
                            exhaustionLevel={participant.exhaustionLevel}
                            showLabels={false}
                            size="sm"
                          />
                        </div>
                      )}

                      {/* HP Bar */}
                      {(mode === "mj" || ownCharacterIds.includes(participant.id)) && (
                        <div className="mt-1.5">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">PV</span>
                            <span
                              className={cn(
                                participant.currentHp <= participant.maxHp * 0.25 &&
                                  "text-crimson font-semibold"
                              )}
                            >
                              {participant.currentHp} / {participant.maxHp}
                            </span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-500 ease-out",
                                getHpColor(participant.currentHp, participant.maxHp)
                              )}
                              style={{
                                width: `${Math.max(0, (participant.currentHp / participant.maxHp) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Death Saving Throws - MJ view (desktop) */}
                      {mode === "mj" && participant.type === "player" && participant.currentHp === 0 && !participant.isDead && !participant.isStabilized && onUpdateDeathSaves && (
                        <div className="mt-2 p-2 bg-crimson/10 rounded-lg border border-crimson/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Skull className="w-4 h-4 text-crimson" />
                            <span className="text-xs font-medium text-crimson">Jets de sauvegarde contre la mort</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-emerald mr-1">Succès:</span>
                              {[0, 1, 2].map((i) => (
                                <button
                                  key={`success-${i}`}
                                  onClick={() => {
                                    const currentSuccesses = participant.deathSaves?.successes ?? 0
                                    const newSuccesses = i < currentSuccesses ? i : i + 1
                                    const isStabilized = newSuccesses >= 3
                                    onUpdateDeathSaves(
                                      participant.id,
                                      participant.type,
                                      { successes: Math.min(3, newSuccesses), failures: participant.deathSaves?.failures ?? 0 },
                                      isStabilized,
                                      false
                                    )
                                  }}
                                  className={cn(
                                    "w-5 h-5 rounded-full border-2 transition-all",
                                    i < (participant.deathSaves?.successes ?? 0)
                                      ? "bg-emerald border-emerald"
                                      : "border-emerald/50 hover:border-emerald"
                                  )}
                                >
                                  {i < (participant.deathSaves?.successes ?? 0) && (
                                    <Check className="w-3 h-3 text-background mx-auto" />
                                  )}
                                </button>
                              ))}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-crimson mr-1">Échecs:</span>
                              {[0, 1, 2].map((i) => (
                                <button
                                  key={`failure-${i}`}
                                  onClick={() => {
                                    const currentFailures = participant.deathSaves?.failures ?? 0
                                    const newFailures = i < currentFailures ? i : i + 1
                                    const isDead = newFailures >= 3
                                    onUpdateDeathSaves(
                                      participant.id,
                                      participant.type,
                                      { successes: participant.deathSaves?.successes ?? 0, failures: Math.min(3, newFailures) },
                                      participant.isStabilized ?? false,
                                      isDead
                                    )
                                  }}
                                  className={cn(
                                    "w-5 h-5 rounded-full border-2 transition-all",
                                    i < (participant.deathSaves?.failures ?? 0)
                                      ? "bg-crimson border-crimson"
                                      : "border-crimson/50 hover:border-crimson"
                                  )}
                                >
                                  {i < (participant.deathSaves?.failures ?? 0) && (
                                    <XCircle className="w-3 h-3 text-background mx-auto" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Status indicators (desktop) */}
                      {participant.isDead && (
                        <div className="mt-2 flex items-center gap-2 text-crimson">
                          <Skull className="w-4 h-4" />
                          <span className="text-xs font-medium">Mort</span>
                        </div>
                      )}
                      {participant.isStabilized && participant.currentHp === 0 && !participant.isDead && (
                        <div className="mt-2 flex items-center gap-2 text-gold">
                          <Heart className="w-4 h-4" />
                          <span className="text-xs font-medium">Stabilisé</span>
                        </div>
                      )}
                      {mode === "joueur" && participant.type === "player" && participant.currentHp === 0 && !participant.isDead && !participant.isStabilized && (
                        <Badge className="mt-2 bg-crimson/20 text-crimson border-crimson/30">
                          Mourant
                        </Badge>
                      )}
                    </div>

                    {/* Actions - desktop */}
                    {mode === "mj" && (
                      <div className="flex gap-1 shrink-0">
                        {onRemoveFromCombat && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-10 w-10 text-muted-foreground hover:text-crimson hover:bg-crimson/10 transition-smooth"
                            onClick={() => onRemoveFromCombat(participant.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                        {onUpdateConditions && onUpdateExhaustion && (
                          <ConditionManager
                            targetName={participant.name}
                            currentConditions={participant.conditions}
                            conditionDurations={participant.conditionDurations}
                            exhaustionLevel={participant.exhaustionLevel}
                            onToggleCondition={(conditionId, duration) => {
                              const isRemoving = participant.conditions.includes(conditionId)
                              const newConditions = isRemoving
                                ? participant.conditions.filter(c => c !== conditionId)
                                : [...participant.conditions, conditionId]
                              const newDurations = { ...(participant.conditionDurations || {}) }
                              if (isRemoving) {
                                delete newDurations[conditionId]
                              } else if (duration) {
                                newDurations[conditionId] = duration
                              }
                              onUpdateConditions(participant.id, newConditions, participant.type, newDurations)
                            }}
                            onSetExhaustion={(level) => {
                              onUpdateExhaustion(participant.id, level, participant.type)
                            }}
                            trigger={
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-10 w-10 border-border hover:border-purple-500 hover:text-purple-500 bg-transparent transition-smooth"
                              >
                                <Zap className="w-4 h-4" />
                              </Button>
                            }
                          />
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[40px] px-3 border-border hover:border-gold hover:text-gold bg-transparent transition-smooth"
                              onClick={() => setSelectedParticipant(participant)}
                            >
                              PV
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)]">
                            <DialogHeader>
                              <DialogTitle className="text-gold">{participant.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Button
                                className="w-full min-h-[40px] bg-emerald/20 hover:bg-emerald/30 text-emerald border border-emerald/30 active:scale-95"
                                onClick={() => {
                                  const hpToRestore = participant.maxHp - participant.currentHp
                                  if (hpToRestore > 0) onUpdateHp?.(participant.id, hpToRestore, participant.type)
                                }}
                                disabled={participant.currentHp >= participant.maxHp}
                              >
                                <HeartPulse className="w-4 h-4 mr-2" />
                                Vie complète
                              </Button>
                              <div>
                                <label className="text-sm text-muted-foreground mb-2 block">
                                  Raccourcis rapides
                                </label>
                                <div className="grid grid-cols-4 gap-1 mb-1">
                                  {QUICK_HP_VALUES.map((value) => (
                                    <Button
                                      key={`damage-${value}`}
                                      variant="outline"
                                      size="sm"
                                      className="h-10 text-crimson border-crimson/30 hover:bg-crimson/10 hover:border-crimson/50 active:scale-95"
                                      onClick={() => onUpdateHp?.(participant.id, -value, participant.type)}
                                    >
                                      -{value}
                                    </Button>
                                  ))}
                                </div>
                                <div className="grid grid-cols-4 gap-1">
                                  {QUICK_HP_VALUES.map((value) => (
                                    <Button
                                      key={`heal-${value}`}
                                      variant="outline"
                                      size="sm"
                                      className="h-10 text-emerald border-emerald/30 hover:bg-emerald/10 hover:border-emerald/50 active:scale-95"
                                      onClick={() => onUpdateHp?.(participant.id, value, participant.type)}
                                    >
                                      +{value}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground mb-2 block">
                                  Montant personnalisé
                                </label>
                                <div className="flex gap-2">
                                  <Input
                                    type="number"
                                    value={hpAmount}
                                    onChange={(e) => setHpAmount(e.target.value)}
                                    placeholder="Autre..."
                                    className="bg-background min-h-[44px]"
                                  />
                                  <Button
                                    onClick={handleDamage}
                                    disabled={!hpAmount}
                                    size="icon"
                                    className="shrink-0 h-11 w-11 bg-crimson hover:bg-crimson/80 active:scale-95 disabled:opacity-50"
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={handleHeal}
                                    disabled={!hpAmount}
                                    size="icon"
                                    className="shrink-0 h-11 w-11 bg-emerald hover:bg-emerald/80 text-background active:scale-95 disabled:opacity-50"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground animate-fade-in">
              <Swords className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Aucun combat en cours</p>
              <p className="text-sm mt-1">
                {mode === "mj"
                  ? "Configurez les initiatives et lancez le combat"
                  : "En attente du début du combat..."}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
