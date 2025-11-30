"use client"

import { useState } from "react"
import { Users, ChevronDown, ChevronUp, Minus, Plus, GripVertical, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Character, CombatParticipant } from "@/lib/types"
import { DraggablePlayerCard } from "@/components/draggable-card"
import { ConditionList } from "@/components/condition-badge"
import { ConditionManager } from "@/components/condition-manager"

interface PlayerPanelProps {
  players: Character[]
  onUpdateHp: (id: string, change: number) => void
  onUpdateInitiative: (id: string, initiative: number) => void
  onUpdateConditions?: (id: string, conditions: string[]) => void
  onUpdateExhaustion?: (id: string, level: number) => void
  onAddPlayerToCombat?: (player: Character) => void
  mode: "mj" | "joueur"
  combatActive?: boolean
  combatParticipants?: CombatParticipant[]
  ownCharacterIds?: string[] // IDs of characters owned by the current player
}

export function PlayerPanel({ players, onUpdateHp, onUpdateInitiative, onUpdateConditions, onUpdateExhaustion, onAddPlayerToCombat, mode, combatActive = false, combatParticipants = [], ownCharacterIds = [] }: PlayerPanelProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [hpChange, setHpChange] = useState<Record<string, string>>({})

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return "bg-emerald"
    if (ratio > 0.25) return "bg-gold"
    return "bg-crimson"
  }

  const isPlayerInCombat = (playerId: string) => {
    return combatParticipants.some(p => p.id === playerId)
  }

  // Build mode: show draggable cards (or tap-to-add on mobile)
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
              {onAddPlayerToCombat ? (
                <>Touchez + pour ajouter au combat</>
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
                    {/* Render player cards */}
                    <div className={cn(
                      "space-y-2",
                      characters.length > 1 && "pl-2 border-l-2 border-gold/20"
                    )}>
                      {characters.map((player) => {
                        const inCombat = isPlayerInCombat(player.id)
                        return (
                          <div
                            key={player.id}
                            className={cn(
                              "p-3 rounded-lg border-2 transition-all",
                              "bg-secondary/60",
                              inCombat
                                ? "border-gold/30 opacity-50"
                                : "border-transparent hover:border-gold/50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {/* Initiative Badge */}
                              <div className="w-9 h-9 shrink-0 rounded-md flex items-center justify-center font-bold text-sm bg-gold text-background">
                                {player.initiative ?? "?"}
                              </div>
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-foreground truncate block">
                                  {player.name}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">
                                    {player.class} Niv.{player.level}
                                  </span>
                                  <Badge variant="outline" className="text-xs border-gold/30 text-gold px-1.5 py-0">
                                    CA {player.ac}
                                  </Badge>
                                </div>
                              </div>
                              {/* Add button - only when onAddPlayerToCombat is provided and not in combat */}
                              {onAddPlayerToCombat && !inCombat && (
                                <Button
                                  size="icon"
                                  className="h-10 w-10 shrink-0 bg-gold hover:bg-gold/80 text-background"
                                  onClick={() => onAddPlayerToCombat(player)}
                                >
                                  <Plus className="w-5 h-5" />
                                </Button>
                              )}
                              {inCombat && (
                                <span className="text-xs text-muted-foreground">Dans le combat</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
            {players.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun joueur</p>
              </div>
            ) : (() => {
              // Group characters by playerSocketId
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
                    className="p-3 cursor-pointer hover:bg-secondary/50 transition-smooth min-h-[72px] active:bg-secondary/60"
                    onClick={() => setExpandedPlayer(expandedPlayer === player.id ? null : player.id)}
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
                        {expandedPlayer === player.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
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

                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Initiative</label>
                          <Input
                            type="number"
                            value={player.initiative || ""}
                            onChange={(e) => onUpdateInitiative(player.id, Number.parseInt(e.target.value) || 0)}
                            className="min-h-[44px] text-sm bg-background"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Modifier PV</label>
                          <Input
                            type="number"
                            value={hpChange[player.id] || ""}
                            onChange={(e) => setHpChange({ ...hpChange, [player.id]: e.target.value })}
                            className="min-h-[44px] text-sm bg-background"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 min-h-[44px] bg-crimson hover:bg-crimson/80 active:scale-95 transition-smooth"
                          onClick={() => {
                            const value = Number.parseInt(hpChange[player.id] || "0")
                            if (value) onUpdateHp(player.id, -Math.abs(value))
                            setHpChange({ ...hpChange, [player.id]: "" })
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
                            if (value) onUpdateHp(player.id, Math.abs(value))
                            setHpChange({ ...hpChange, [player.id]: "" })
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Soins
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Expanded Actions - Player Mode (Damage Reporting) */}
                  {expandedPlayer === player.id && mode === "joueur" && (
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
