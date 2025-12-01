"use client"

import { useState } from "react"
import { User, Shield, Heart, Minus, Plus, Zap, HeartPulse, Backpack } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { Character, CharacterInventory } from "@/lib/types"
import { DEFAULT_INVENTORY } from "@/lib/types"
import { ConditionList } from "@/components/condition-badge"
import { InventoryManager } from "@/components/inventory-manager"

interface MyCharactersPanelProps {
  characters: Character[]
  onUpdateHp: (id: string, change: number) => void
  onUpdateInventory?: (id: string, inventory: CharacterInventory) => void
  combatActive?: boolean
}

const QUICK_HP_VALUES = [1, 3, 5, 10]

export function MyCharactersPanel({ characters, onUpdateHp, onUpdateInventory, combatActive = false }: MyCharactersPanelProps) {
  const [hpChange, setHpChange] = useState<Record<string, string>>({})

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return "bg-emerald"
    if (ratio > 0.25) return "bg-gold"
    return "bg-crimson"
  }

  const getHpTextColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return "text-emerald"
    if (ratio > 0.25) return "text-gold"
    return "text-crimson"
  }

  const handleDamage = (characterId: string) => {
    const value = Number.parseInt(hpChange[characterId] || "0")
    if (value > 0) {
      onUpdateHp(characterId, -Math.abs(value))
      setHpChange({ ...hpChange, [characterId]: "" })
    }
  }

  const handleHeal = (characterId: string) => {
    const value = Number.parseInt(hpChange[characterId] || "0")
    if (value > 0) {
      onUpdateHp(characterId, Math.abs(value))
      setHpChange({ ...hpChange, [characterId]: "" })
    }
  }

  const handleFullHp = (character: Character) => {
    const hpToRestore = character.maxHp - character.currentHp
    if (hpToRestore > 0) {
      onUpdateHp(character.id, hpToRestore)
    }
  }

  if (characters.length === 0) {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-gold">
            <User className="w-5 h-5" />
            Mes Personnages
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground py-8">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Aucun personnage sélectionné</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-gold">
          <User className="w-5 h-5" />
          Mes Personnages
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full px-4 md:px-6 pb-6">
          <div className="space-y-4">
            {characters.map((character) => (
              <div
                key={character.id}
                className="bg-secondary/30 rounded-lg border border-border/50 overflow-hidden"
              >
                {/* Character Header */}
                <div className="p-4 border-b border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-foreground">{character.name}</h3>
                    <Badge variant="outline" className="border-gold/50 text-gold">
                      <Shield className="w-3 h-3 mr-1" />
                      CA {character.ac}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {character.class} Niveau {character.level}
                  </p>
                </div>

                {/* HP Section */}
                <div className="p-4 bg-secondary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-5 h-5 text-crimson" />
                    <span className="text-sm font-medium text-muted-foreground">Points de vie</span>
                  </div>

                  {/* HP Display */}
                  <div className="mb-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className={cn(
                        "text-3xl font-bold",
                        getHpTextColor(character.currentHp, character.maxHp)
                      )}>
                        {character.currentHp}
                      </span>
                      <span className="text-lg text-muted-foreground">/ {character.maxHp}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-500 ease-out",
                          getHpColor(character.currentHp, character.maxHp)
                        )}
                        style={{ width: `${Math.max(0, (character.currentHp / character.maxHp) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* HP Controls */}
                  <div className="space-y-3">
                    {/* Full HP Button */}
                    <Button
                      className="w-full min-h-[40px] bg-emerald/20 hover:bg-emerald/30 text-emerald border border-emerald/30 active:scale-95 transition-smooth"
                      onClick={() => handleFullHp(character)}
                      disabled={character.currentHp >= character.maxHp}
                    >
                      <HeartPulse className="w-4 h-4 mr-2" />
                      Vie complète
                    </Button>

                    {/* Quick HP Buttons */}
                    <div className="grid grid-cols-4 gap-1">
                      {QUICK_HP_VALUES.map((value) => (
                        <Button
                          key={`damage-${value}`}
                          variant="outline"
                          size="sm"
                          className="h-9 text-crimson border-crimson/30 hover:bg-crimson/10 hover:border-crimson/50 active:scale-95"
                          onClick={() => onUpdateHp(character.id, -value)}
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
                          className="h-9 text-emerald border-emerald/30 hover:bg-emerald/10 hover:border-emerald/50 active:scale-95"
                          onClick={() => onUpdateHp(character.id, value)}
                        >
                          +{value}
                        </Button>
                      ))}
                    </div>

                    {/* Custom Amount */}
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={hpChange[character.id] || ""}
                        onChange={(e) => setHpChange({ ...hpChange, [character.id]: e.target.value })}
                        placeholder="Autre..."
                        className="text-center font-semibold bg-background"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="shrink-0 bg-crimson hover:bg-crimson/80 active:scale-95"
                        onClick={() => handleDamage(character.id)}
                        disabled={!hpChange[character.id] || Number.parseInt(hpChange[character.id]) <= 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="shrink-0 bg-emerald hover:bg-emerald/80 text-background active:scale-95"
                        onClick={() => handleHeal(character.id)}
                        disabled={!hpChange[character.id] || Number.parseInt(hpChange[character.id]) <= 0}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Inventory Section */}
                {onUpdateInventory && (
                  <div className="p-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Backpack className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium text-muted-foreground">Inventaire</span>
                    </div>
                    <InventoryManager
                      characterName={character.name}
                      inventory={character.inventory || DEFAULT_INVENTORY}
                      onInventoryChange={(inventory) => onUpdateInventory(character.id, inventory)}
                      trigger={
                        <Button
                          variant="outline"
                          className="w-full min-h-[40px] border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10 text-blue-500"
                        >
                          <Backpack className="w-4 h-4 mr-2" />
                          Voir l'inventaire
                        </Button>
                      }
                    />
                  </div>
                )}

                {/* Conditions */}
                {(character.conditions.length > 0 || character.exhaustionLevel > 0) && (
                  <div className="p-4 border-t border-border/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium text-muted-foreground">États</span>
                    </div>
                    <ConditionList
                      conditions={character.conditions}
                      exhaustionLevel={character.exhaustionLevel}
                      size="md"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
