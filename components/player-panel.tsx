"use client"

import { useState } from "react"
import { Users, ChevronDown, ChevronUp, Minus, Plus, GripVertical, Zap, UserPlus, Check, WifiOff, Wifi, HeartPulse, Backpack, Eye } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { Character, CombatParticipant, CharacterInventory } from "@/lib/types"
import { DEFAULT_INVENTORY } from "@/lib/types"
import { DraggablePlayerCard } from "@/components/draggable-card"
import { ConditionList } from "@/components/condition-badge"
import { ConditionManager } from "@/components/condition-manager"
import { InventoryManager } from "@/components/inventory-manager"

const QUICK_HP_VALUES = [1, 3, 5, 10]

function formatMod(score: number | null | undefined): string {
  if (score == null) return "-"
  const mod = Math.floor((score - 10) / 2)
  return mod >= 0 ? `+${mod}` : `${mod}`
}

interface PlayerPanelProps {
  players: Character[]
  onUpdateHp: (id: string, change: number) => void
  onUpdateInitiative: (id: string, initiative: number) => void
  onUpdateConditions?: (id: string, conditions: string[]) => void
  onUpdateExhaustion?: (id: string, level: number) => void
  onUpdateInventory?: (id: string, inventory: CharacterInventory) => void
  mode: "mj" | "joueur"
  combatActive?: boolean
  combatParticipants?: CombatParticipant[]
  ownCharacterIds?: string[] // IDs of characters owned by the current player
  onAddToCombat?: (player: Character) => void // For mobile tap-to-add
}

export function PlayerPanel({ players, onUpdateHp, onUpdateInitiative, onUpdateConditions, onUpdateExhaustion, onUpdateInventory, mode, combatActive = false, combatParticipants = [], ownCharacterIds = [], onAddToCombat }: PlayerPanelProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [hpChange, setHpChange] = useState<Record<string, string>>({})
  const [playerToAdd, setPlayerToAdd] = useState<Character | null>(null)
  const [initiativeValue, setInitiativeValue] = useState("")

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return "bg-emerald"
    if (ratio > 0.25) return "bg-gold"
    return "bg-crimson"
  }

  const isPlayerInCombat = (playerId: string) => {
    return combatParticipants.some(p => p.id === playerId)
  }

  // Build mode: show draggable cards (desktop) or tap-to-add cards (mobile)
  if (!combatActive && mode === "mj") {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-gold">
            <Users className="w-5 h-5" />
            Groupe
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-6 pb-6">
            <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
              {onAddToCombat ? (
                <>
                  <UserPlus className="w-3 h-3" />
                  Appuyez pour ajouter au combat
                </>
              ) : (
                <>
                  <GripVertical className="w-3 h-3" />
                  Glissez les joueurs dans la zone de combat
                </>
              )}
            </p>
            <div className="space-y-2">
              {players.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun joueur connecté</p>
                  <p className="text-sm">Les joueurs apparaîtront ici</p>
                </div>
              ) : (() => {
                // Group characters by playerSocketId for drag-and-drop
                const groupedPlayers: Record<string, Character[]> = players.reduce((groups, player) => {
                  const key = player.playerSocketId || player.id
                  if (!groups[key]) groups[key] = []
                  groups[key].push(player)
                  return groups
                }, {} as Record<string, Character[]>)

                return Object.entries(groupedPlayers).map(([socketId, characters]) => (
                  <div key={socketId} className="space-y-2">
                    {/* Player group indicator - only show if multiple characters */}
                    {characters.length > 1 && characters[0].isFirstInGroup && (
                      <div className="text-xs text-muted-foreground px-2 flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Groupe de {characters.length} personnages
                      </div>
                    )}
                    {/* Render cards with visual connection */}
                    <div className={cn(
                      "space-y-2",
                      characters.length > 1 && "pl-2 border-l-2 border-gold/20"
                    )}>
                      {characters.map((player) => {
                        const inCombat = isPlayerInCombat(player.id)

                        // Mobile: tap-to-add cards
                        if (onAddToCombat) {
                          const isDisconnected = !player.isConnected
                          const canAdd = !inCombat

                          return (
                            <div
                              key={player.id}
                              className={cn(
                                "p-3 rounded-lg border transition-smooth",
                                isDisconnected
                                  ? "bg-muted/30 border-border/30 opacity-60"
                                  : inCombat
                                    ? "bg-gold/10 border-gold/30"
                                    : "bg-secondary/30 border-border/50 active:bg-secondary/50"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className={cn(
                                      "font-semibold truncate",
                                      isDisconnected ? "text-muted-foreground" : "text-foreground"
                                    )}>
                                      {player.name}
                                    </h3>
                                    {isDisconnected ? (
                                      <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-xs shrink-0">
                                        <WifiOff className="w-3 h-3 mr-1" />
                                        Hors ligne
                                      </Badge>
                                    ) : inCombat ? (
                                      <Badge variant="outline" className="border-gold/50 text-gold text-xs shrink-0">
                                        <Check className="w-3 h-3 mr-1" />
                                        Ajouté
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="border-emerald/50 text-emerald text-xs shrink-0">
                                        <Wifi className="w-3 h-3 mr-1" />
                                        En ligne
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {player.class} Niv. {player.level} • CA {player.ac}
                                    {player.passivePerception && ` • PP ${player.passivePerception}`}
                                  </p>
                                </div>
                                <Button
                                  size="icon"
                                  variant={canAdd ? "default" : "ghost"}
                                  className={cn(
                                    "ml-2 shrink-0 h-10 w-10",
                                    canAdd
                                      ? isDisconnected
                                        ? "bg-muted hover:bg-muted/80 text-muted-foreground"
                                        : "bg-gold hover:bg-gold/80 text-background"
                                      : "text-muted-foreground"
                                  )}
                                  onClick={() => canAdd && setPlayerToAdd(player)}
                                  disabled={!canAdd}
                                >
                                  {inCombat ? (
                                    <Check className="w-5 h-5" />
                                  ) : (
                                    <UserPlus className="w-5 h-5" />
                                  )}
                                </Button>
                              </div>
                            </div>
                          )
                        }

                        // Desktop: draggable cards
                        return (
                          <DraggablePlayerCard
                            key={player.id}
                            player={player}
                            isInCombat={inCombat}
                            onUpdateInitiative={(init) => onUpdateInitiative(player.id, init)}
                          />
                        )
                      })}
                    </div>
                  </div>
                ))
              })()}
            </div>
          </ScrollArea>
        </CardContent>

        {/* Initiative Dialog for mobile */}
        <Dialog open={!!playerToAdd} onOpenChange={(open) => !open && setPlayerToAdd(null)}>
          <DialogContent className="bg-card border-border max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-gold">
                Ajouter {playerToAdd?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <label className="text-sm text-muted-foreground mb-2 block">
                Initiative (1-20)
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                value={initiativeValue}
                onChange={(e) => setInitiativeValue(e.target.value)}
                placeholder="Entrez l'initiative..."
                className="text-center text-lg font-bold bg-gold/10 border-gold text-gold"
                autoFocus
              />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setPlayerToAdd(null)}>
                Annuler
              </Button>
              <Button
                onClick={() => {
                  if (playerToAdd && onAddToCombat) {
                    // Clamp initiative between 1-20 like on desktop
                    const parsed = parseInt(initiativeValue)
                    const init = isNaN(parsed) || parsed < 1 ? 1 : Math.min(20, parsed)
                    onUpdateInitiative(playerToAdd.id, init)
                    onAddToCombat({ ...playerToAdd, initiative: init })
                    setPlayerToAdd(null)
                    setInitiativeValue("")
                  }
                }}
                className="bg-gold hover:bg-gold/80 text-background"
              >
                <UserPlus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    )
  }

  // During combat, only show players who are in the combat
  const playersToShow = combatActive
    ? players.filter(p => combatParticipants.some(cp => cp.id === p.id))
    : players

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-gold">
          <Users className="w-5 h-5" />
          Groupe
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-6 pb-6">
          <div className="space-y-3">
            {playersToShow.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{combatActive ? "Aucun joueur dans le combat" : "Aucun joueur"}</p>
              </div>
            ) : (() => {
              // Group characters by playerSocketId
              const groupedPlayers: Record<string, Character[]> = playersToShow.reduce((groups, player) => {
                const key = player.playerSocketId || player.id
                if (!groups[key]) groups[key] = []
                groups[key].push(player)
                return groups
              }, {} as Record<string, Character[]>)

              return Object.entries(groupedPlayers).map(([socketId, characters]) => (
                <div key={socketId} className="space-y-2">
                  {/* Player group indicator - only show if multiple characters */}
                  {characters.length > 1 && characters[0].isFirstInGroup && (
                    <div className="text-xs text-muted-foreground px-2 flex items-center gap-2">
                      <Users className="w-3 h-3" />
                      Groupe de {characters.length} personnages
                    </div>
                  )}
                  {/* Render characters with visual connection */}
                  <div className={cn(
                    "space-y-2",
                    characters.length > 1 && "pl-2 border-l-2 border-gold/20"
                  )}>
                    {characters.map((player, index) => (
                <div
                  key={player.id}
                  className={cn(
                    "bg-secondary/30 rounded-lg border border-border/50 overflow-hidden",
                    index === 0 && "animate-fade-in"
                  )}
                >
                  {/* Main Row */}
                  <div
                    className={cn(
                      "p-3 transition-smooth min-h-[72px]",
                      // Only allow expansion for DM or player's own characters
                      (mode === "mj" || ownCharacterIds.includes(player.id))
                        ? "cursor-pointer hover:bg-secondary/50 active:bg-secondary/60"
                        : ""
                    )}
                    onClick={() => {
                      // Only allow expansion for DM or player's own characters
                      if (mode === "mj" || ownCharacterIds.includes(player.id)) {
                        setExpandedPlayer(expandedPlayer === player.id ? null : player.id)
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{player.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {player.class} Niv. {player.level}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-gold/50 text-gold">
                          CA {player.ac}
                        </Badge>
                        {mode === "mj" && player.passivePerception && (
                          <Badge variant="outline" className="border-sky-500/50 text-sky-500">
                            <Eye className="w-3 h-3 mr-1" />
                            PP {player.passivePerception}
                          </Badge>
                        )}
                        {/* Only show expand chevron for DM or player's own characters */}
                        {(mode === "mj" || ownCharacterIds.includes(player.id)) && (
                          expandedPlayer === player.id ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )
                        )}
                      </div>
                    </div>

                    {/* HP Bar - Visible for DM or for the player's own characters */}
                    {(mode === "mj" || ownCharacterIds.includes(player.id)) && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">PV</span>
                          <span
                            className={cn(
                              player.currentHp <= player.maxHp * 0.25
                                ? "text-crimson font-semibold animate-pulse"
                                : "text-foreground"
                            )}
                          >
                            {player.currentHp} / {player.maxHp}
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500 ease-out",
                              getHpColor(player.currentHp, player.maxHp)
                            )}
                            style={{ width: `${Math.max(0, (player.currentHp / player.maxHp) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Conditions */}
                    {(player.conditions.length > 0 || player.exhaustionLevel > 0) && (
                      <div className="mt-2">
                        <ConditionList
                          conditions={player.conditions}
                          conditionDurations={combatParticipants?.find(p => p.id === player.id)?.conditionDurations}
                          exhaustionLevel={player.exhaustionLevel}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Expanded Actions - DM Mode */}
                  {expandedPlayer === player.id && mode === "mj" && (
                    <div className="px-3 pb-3 pt-2 border-t border-border/50 bg-secondary/20 animate-slide-down">
                      {/* Condition Manager */}
                      {onUpdateConditions && onUpdateExhaustion && (
                        <div className="mb-3">
                          <ConditionManager
                            targetName={player.name}
                            currentConditions={player.conditions}
                            exhaustionLevel={player.exhaustionLevel}
                            onToggleCondition={(conditionId) => {
                              const newConditions = player.conditions.includes(conditionId)
                                ? player.conditions.filter(c => c !== conditionId)
                                : [...player.conditions, conditionId]
                              onUpdateConditions(player.id, newConditions)
                            }}
                            onSetExhaustion={(level) => {
                              onUpdateExhaustion(player.id, level)
                            }}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full min-h-[40px] border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10 text-purple-500"
                              >
                                <Zap className="w-4 h-4 mr-2" />
                                Gérer les états
                              </Button>
                            }
                          />
                        </div>
                      )}

                      {/* Combat Stats Section - DM Only */}
                      {(player.passivePerception || player.strength) && (
                        <div className="mb-3 p-2 bg-secondary/30 rounded-lg">
                          <h4 className="text-xs text-muted-foreground mb-2 font-medium">Stats de combat</h4>

                          {/* Passive Perception */}
                          {player.passivePerception && (
                            <div className="flex items-center gap-2 mb-2">
                              <Eye className="w-4 h-4 text-gold" />
                              <span className="text-sm">PP {player.passivePerception}</span>
                            </div>
                          )}

                          {/* Ability Scores Grid */}
                          <div className="grid grid-cols-6 gap-1 text-center text-xs">
                            {[
                              { label: "FOR", value: player.strength },
                              { label: "DEX", value: player.dexterity },
                              { label: "CON", value: player.constitution },
                              { label: "INT", value: player.intelligence },
                              { label: "SAG", value: player.wisdom },
                              { label: "CHA", value: player.charisma },
                            ].map((stat) => (
                              <div key={stat.label} className="p-1 bg-background/50 rounded">
                                <div className="text-muted-foreground">{stat.label}</div>
                                <div className="font-medium">{stat.value ?? "-"}</div>
                                <div className="text-gold text-xs">{formatMod(stat.value)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Inventory Manager */}
                      {onUpdateInventory && (
                        <div className="mb-3">
                          <InventoryManager
                            characterName={player.name}
                            inventory={player.inventory || DEFAULT_INVENTORY}
                            onInventoryChange={(inventory) => onUpdateInventory(player.id, inventory)}
                            trigger={
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full min-h-[40px] border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10 text-blue-500"
                              >
                                <Backpack className="w-4 h-4 mr-2" />
                                Gérer l'inventaire
                              </Button>
                            }
                          />
                        </div>
                      )}

                      {/* Initiative */}
                      <div className="mb-3">
                        <label className="text-xs text-muted-foreground mb-1 block">Initiative</label>
                        <Input
                          type="number"
                          value={player.initiative || ""}
                          onChange={(e) => onUpdateInitiative(player.id, Number.parseInt(e.target.value) || 0)}
                          className="min-h-[40px] text-sm bg-background"
                          placeholder="0"
                        />
                      </div>

                      {/* Full HP Button */}
                      <Button
                        size="sm"
                        className="w-full mb-2 min-h-[36px] bg-emerald/20 hover:bg-emerald/30 text-emerald border border-emerald/30 active:scale-95"
                        onClick={() => {
                          const hpToRestore = player.maxHp - player.currentHp
                          if (hpToRestore > 0) onUpdateHp(player.id, hpToRestore)
                        }}
                        disabled={player.currentHp >= player.maxHp}
                      >
                        <HeartPulse className="w-4 h-4 mr-1" />
                        Vie complète
                      </Button>

                      {/* Quick HP Buttons */}
                      <div className="grid grid-cols-4 gap-1 mb-1">
                        {QUICK_HP_VALUES.map((value) => (
                          <Button
                            key={`damage-${value}`}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-crimson border-crimson/30 hover:bg-crimson/10 active:scale-95"
                            onClick={() => onUpdateHp(player.id, -value)}
                          >
                            -{value}
                          </Button>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-1 mb-2">
                        {QUICK_HP_VALUES.map((value) => (
                          <Button
                            key={`heal-${value}`}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs text-emerald border-emerald/30 hover:bg-emerald/10 active:scale-95"
                            onClick={() => onUpdateHp(player.id, value)}
                          >
                            +{value}
                          </Button>
                        ))}
                      </div>

                      {/* Custom Amount */}
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={hpChange[player.id] || ""}
                          onChange={(e) => setHpChange({ ...hpChange, [player.id]: e.target.value })}
                          className="min-h-[40px] text-sm bg-background"
                          placeholder="Autre..."
                        />
                        <Button
                          size="icon"
                          variant="destructive"
                          className="shrink-0 h-10 w-10 bg-crimson hover:bg-crimson/80 active:scale-95"
                          onClick={() => {
                            const value = Number.parseInt(hpChange[player.id] || "0")
                            if (value) onUpdateHp(player.id, -Math.abs(value))
                            setHpChange({ ...hpChange, [player.id]: "" })
                          }}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="shrink-0 h-10 w-10 bg-emerald hover:bg-emerald/80 text-background active:scale-95"
                          onClick={() => {
                            const value = Number.parseInt(hpChange[player.id] || "0")
                            if (value) onUpdateHp(player.id, Math.abs(value))
                            setHpChange({ ...hpChange, [player.id]: "" })
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Expanded Actions - Player Mode (Damage Reporting) - Only for own characters */}
                  {expandedPlayer === player.id && mode === "joueur" && ownCharacterIds.includes(player.id) && (
                    <div className="px-3 pb-3 pt-2 border-t border-border/50 bg-secondary/20 animate-slide-down">
                      <p className="text-xs text-muted-foreground mb-2">Signaler des dégâts ou soins</p>
                      <div className="flex gap-2 mb-2">
                        <Input
                          type="number"
                          value={hpChange[player.id] || ""}
                          onChange={(e) => setHpChange({ ...hpChange, [player.id]: e.target.value })}
                          className="min-h-[44px] text-sm bg-background flex-1"
                          placeholder="Montant"
                          min="1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 min-h-[44px] bg-crimson hover:bg-crimson/80 active:scale-95 transition-smooth"
                          onClick={() => {
                            const value = Number.parseInt(hpChange[player.id] || "0")
                            if (value) {
                              onUpdateHp(player.id, -Math.abs(value))
                              setHpChange({ ...hpChange, [player.id]: "" })
                              setExpandedPlayer(null)
                            }
                          }}
                        >
                          <Minus className="w-4 h-4 mr-1" />
                          Dégâts
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 min-h-[44px] bg-emerald hover:bg-emerald/80 text-background active:scale-95 transition-smooth"
                          onClick={() => {
                            const value = Number.parseInt(hpChange[player.id] || "0")
                            if (value) {
                              onUpdateHp(player.id, Math.abs(value))
                              setHpChange({ ...hpChange, [player.id]: "" })
                              setExpandedPlayer(null)
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Soins
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
                  </div>
                </div>
              ))
            })()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}