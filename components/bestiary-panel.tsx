"use client"

import { useState } from "react"
import { Skull, Plus, Trash2, Minus, Database, Swords, GripVertical } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MonsterDatabase } from "@/components/monster-database"
import { FightPresetsPanel } from "@/components/fight-presets-panel"
import { cn } from "@/lib/utils"
import type { Monster, DbMonster, CombatParticipant } from "@/lib/types"
import { DraggableMonsterCard } from "@/components/draggable-card"

interface BestiaryPanelProps {
  monsters: Monster[]
  onAddMonster: (monster: Omit<Monster, "id">) => void
  onRemoveMonster: (id: string) => void
  onUpdateHp: (id: string, change: number) => void
  onLoadPreset?: (monsters: Monster[]) => void
  mode: "mj" | "joueur"
  combatActive?: boolean
  combatParticipants?: CombatParticipant[]
  campaignId?: number
}

export function BestiaryPanel({ monsters, onAddMonster, onRemoveMonster, onUpdateHp, onLoadPreset, mode, combatActive = false, combatParticipants = [], campaignId }: BestiaryPanelProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newMonster, setNewMonster] = useState({
    name: "",
    maxHp: "",
    ac: "",
    initiative: "",
    notes: "",
  })

  const isMonsterInCombat = (monsterId: string) => {
    return combatParticipants.some(p => p.id === monsterId)
  }

  const handleAddMonster = () => {
    if (newMonster.name && newMonster.maxHp) {
      onAddMonster({
        name: newMonster.name,
        hp: Number.parseInt(newMonster.maxHp),
        maxHp: Number.parseInt(newMonster.maxHp),
        ac: Number.parseInt(newMonster.ac) || 10,
        initiative: Number.parseInt(newMonster.initiative) || 0,
        notes: newMonster.notes,
        status: "actif",
      })
      setNewMonster({ name: "", maxHp: "", ac: "", initiative: "", notes: "" })
      setIsAddDialogOpen(false)
    }
  }

  const getHpColor = (current: number, max: number) => {
    const ratio = current / max
    if (ratio > 0.5) return "bg-emerald"
    if (ratio > 0.25) return "bg-gold"
    return "bg-crimson"
  }

  const handleAddFromDatabase = (dbMonster: DbMonster) => {
    onAddMonster({
      name: dbMonster.name,
      hp: dbMonster.hit_points || 10,
      maxHp: dbMonster.hit_points || 10,
      ac: dbMonster.armor_class || 10,
      initiative: dbMonster.dexterity_mod || 0,
      notes: dbMonster.actions?.map(a => a.name).join(", ") || "",
      status: "actif",
    })
  }

  if (mode === "joueur") {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-crimson">
            <Skull className="w-5 h-5" />
            Ennemis
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-6 pb-6">
            <div className="space-y-2">
              {monsters.length === 0 ? (
                <div className="text-center text-muted-foreground py-8 animate-fade-in">
                  <Skull className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun ennemi en vue</p>
                </div>
              ) : (
                monsters.map((monster, index) => (
                  <div
                    key={monster.id}
                    className={cn(
                      "p-3 bg-secondary/30 rounded-lg border border-border/50 min-h-[56px]",
                      index === 0 && "animate-fade-in"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-crimson">{monster.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          monster.hp > 0
                            ? "border-emerald/50 text-emerald"
                            : "border-muted text-muted-foreground"
                        )}
                      >
                        {monster.hp > 0 ? "Actif" : "Mort"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <CardTitle className="flex items-center gap-2 text-crimson">
          <Skull className="w-5 h-5" />
          Bestiaire
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col p-0 px-6 pb-6">
        <Tabs defaultValue="combat" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mb-3 shrink-0">
            <TabsTrigger value="combat" className="flex items-center gap-1 min-h-[40px]">
              <Swords className="w-4 h-4" />
              Combat
            </TabsTrigger>
            <TabsTrigger value="database" className="flex items-center gap-1 min-h-[40px]">
              <Database className="w-4 h-4" />
              Base de données
            </TabsTrigger>
          </TabsList>

          <TabsContent value="combat" className="flex-1 overflow-hidden mt-0 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3 shrink-0">
              {/* Fight Presets - Save/Load */}
              {campaignId && onLoadPreset && !combatActive && (
                <FightPresetsPanel
                  campaignId={campaignId}
                  currentMonsters={monsters}
                  onLoadPreset={onLoadPreset}
                />
              )}
              <div className="flex-1" />
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="min-h-[44px] bg-crimson hover:bg-crimson/80 active:scale-95 transition-smooth"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Création manuelle
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border max-w-[calc(100vw-2rem)]">
                  <DialogHeader>
                    <DialogTitle className="text-gold">Ajouter un monstre</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nom</Label>
                      <Input
                        id="name"
                        value={newMonster.name}
                        onChange={(e) => setNewMonster({ ...newMonster, name: e.target.value })}
                        placeholder="Gobelin, Orc..."
                        className="bg-background min-h-[44px] mt-1"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="hp">PV max</Label>
                        <Input
                          id="hp"
                          type="number"
                          value={newMonster.maxHp}
                          onChange={(e) => setNewMonster({ ...newMonster, maxHp: e.target.value })}
                          placeholder="10"
                          className="bg-background min-h-[44px] mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="ac">CA</Label>
                        <Input
                          id="ac"
                          type="number"
                          value={newMonster.ac}
                          onChange={(e) => setNewMonster({ ...newMonster, ac: e.target.value })}
                          placeholder="13"
                          className="bg-background min-h-[44px] mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="initiative">Initiative</Label>
                        <Input
                          id="initiative"
                          type="number"
                          value={newMonster.initiative}
                          onChange={(e) => setNewMonster({ ...newMonster, initiative: e.target.value })}
                          placeholder="12"
                          className="bg-background min-h-[44px] mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newMonster.notes}
                        onChange={(e) => setNewMonster({ ...newMonster, notes: e.target.value })}
                        placeholder="Capacités spéciales, tactiques..."
                        className="bg-background resize-none mt-1"
                        rows={3}
                      />
                    </div>
                    <Button
                      onClick={handleAddMonster}
                      className="w-full min-h-[48px] bg-primary hover:bg-primary/80 active:scale-95 transition-smooth"
                    >
                      Ajouter au combat
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Build mode: show draggable monster cards */}
            {!combatActive ? (
              <ScrollArea className="flex-1">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1 pr-2">
                  <GripVertical className="w-3 h-3" />
                  Glissez les monstres dans la zone de combat
                </p>
                <div className="space-y-2 pr-2">
                  {monsters.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 animate-fade-in">
                      <Skull className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Aucun monstre</p>
                      <p className="text-sm">Ajoutez des créatures depuis la base de données</p>
                    </div>
                  ) : (
                    monsters.map((monster) => (
                      <DraggableMonsterCard
                        key={monster.id}
                        monster={monster}
                        isInCombat={isMonsterInCombat(monster.id)}
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            ) : (
              /* Combat active: show regular monster management */
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-2">
                  {monsters.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 animate-fade-in">
                      <Skull className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Aucun monstre</p>
                      <p className="text-sm">Ajoutez des créatures depuis la base de données</p>
                    </div>
                  ) : (
                    monsters.map((monster, index) => (
                    <div
                      key={monster.id}
                      className={cn(
                        "p-3 bg-secondary/30 rounded-lg border border-border/50",
                        monster.hp === 0 && "opacity-50",
                        index === 0 && "animate-fade-in"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-crimson">{monster.name}</h3>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs border-gold/50 text-gold">
                              CA {monster.ac}
                            </Badge>
                            <Badge variant="outline" className="text-xs border-border">
                              Init {monster.initiative}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 text-muted-foreground hover:text-crimson transition-smooth shrink-0"
                          onClick={() => onRemoveMonster(monster.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* HP Bar */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">PV</span>
                          <span
                            className={cn(
                              monster.hp <= monster.maxHp * 0.25 && "text-crimson font-semibold"
                            )}
                          >
                            {monster.hp} / {monster.maxHp}
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all duration-500 ease-out",
                              getHpColor(monster.hp, monster.maxHp)
                            )}
                            style={{ width: `${Math.max(0, (monster.hp / monster.maxHp) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-h-[40px] text-xs border-crimson/30 hover:bg-crimson/20 hover:text-crimson bg-transparent active:scale-95 transition-smooth"
                          onClick={() => onUpdateHp(monster.id, -1)}
                        >
                          <Minus className="w-3 h-3 mr-1" />1
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-h-[40px] text-xs border-crimson/30 hover:bg-crimson/20 hover:text-crimson bg-transparent active:scale-95 transition-smooth"
                          onClick={() => onUpdateHp(monster.id, -5)}
                        >
                          <Minus className="w-3 h-3 mr-1" />5
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 min-h-[40px] text-xs border-emerald/30 hover:bg-emerald/20 hover:text-emerald bg-transparent active:scale-95 transition-smooth"
                          onClick={() => onUpdateHp(monster.id, 5)}
                        >
                          <Plus className="w-3 h-3 mr-1" />5
                        </Button>
                      </div>

                      {monster.notes && (
                        <p className="text-xs text-muted-foreground mt-2 italic">{monster.notes}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="database" className="flex-1 overflow-hidden mt-0">
            <MonsterDatabase onAddToCombat={handleAddFromDatabase} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
