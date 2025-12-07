"use client"

import { useState, useEffect } from "react"
import { Search, Dog, Plus, Shield, Heart, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MonsterDetail } from "@/components/monster-detail"
import { cn } from "@/lib/utils"
import type { CombatParticipant, DbMonster } from "@/lib/types"

interface AddPetDialogProps {
  owner: CombatParticipant
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddPet: (pet: Omit<CombatParticipant, 'id'>) => void
}

export function AddPetDialog({
  owner,
  open,
  onOpenChange,
  onAddPet,
}: AddPetDialogProps) {
  // Bestiary state
  const [monsters, setMonsters] = useState<DbMonster[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [viewingMonster, setViewingMonster] = useState<DbMonster | null>(null)

  // Quick create state
  const [petName, setPetName] = useState("")
  const [petHp, setPetHp] = useState(10)
  const [petAc, setPetAc] = useState<number | undefined>(undefined)

  // Fetch monsters when dialog opens
  useEffect(() => {
    if (open) {
      fetchMonsters()
    }
  }, [open])

  // Search monsters
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      fetchMonsters(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, open])

  const fetchMonsters = async (query?: string) => {
    setLoading(true)
    try {
      const url = query
        ? `/api/monsters?q=${encodeURIComponent(query)}`
        : "/api/monsters"
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setMonsters(data)
      }
    } catch (error) {
      console.error("Failed to fetch monsters:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddFromBestiary = (monster: DbMonster) => {
    onAddPet({
      name: monster.name,
      initiative: owner.initiative, // Same initiative as owner
      currentHp: monster.hit_points || 10,
      maxHp: monster.hit_points || 10,
      ac: monster.armor_class || undefined,
      conditions: [],
      exhaustionLevel: 0,
      buffs: [],
      type: "monster", // Pets are treated as monsters for stats
      isPet: true,
      ownerId: owner.id,
      ownerType: owner.type,
      xp: monster.challenge_rating_xp || undefined,
    })
    onOpenChange(false)
    resetForm()
  }

  const handleQuickCreate = () => {
    if (!petName.trim()) return

    onAddPet({
      name: petName.trim(),
      initiative: owner.initiative, // Same initiative as owner
      currentHp: petHp,
      maxHp: petHp,
      ac: petAc,
      conditions: [],
      exhaustionLevel: 0,
      buffs: [],
      type: "monster", // Pets are treated as monsters for stats
      isPet: true,
      ownerId: owner.id,
      ownerType: owner.type,
    })
    onOpenChange(false)
    resetForm()
  }

  const resetForm = () => {
    setPetName("")
    setPetHp(10)
    setPetAc(undefined)
    setSearchQuery("")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dog className="w-5 h-5" />
              Ajouter un familier à {owner.name}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="bestiary" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bestiary">Bestiaire</TabsTrigger>
              <TabsTrigger value="quick">Création rapide</TabsTrigger>
            </TabsList>

            {/* Bestiary Tab */}
            <TabsContent value="bestiary" className="flex-1 overflow-hidden flex flex-col mt-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un monstre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-2 pb-4">
                  {loading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Chargement...
                    </div>
                  ) : monsters.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun monstre trouvé
                    </div>
                  ) : (
                    monsters.slice(0, 20).map((monster) => (
                      <div
                        key={monster.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 border border-transparent hover:border-border transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {monster.image_url && (
                            <div className="w-10 h-10 rounded overflow-hidden border border-border shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={monster.image_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-medium text-sm truncate">{monster.name}</h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="truncate">{monster.creature_type}</span>
                              <Badge variant="outline" className="text-xs border-crimson/30 text-crimson">
                                PV {monster.hit_points}
                              </Badge>
                              {monster.armor_class && (
                                <Badge variant="outline" className="text-xs border-gold/30 text-gold">
                                  CA {monster.armor_class}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setViewingMonster(monster)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            className="h-8 w-8 bg-emerald hover:bg-emerald/80 text-white"
                            onClick={() => handleAddFromBestiary(monster)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Quick Create Tab */}
            <TabsContent value="quick" className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pet-name">Nom du familier *</Label>
                <Input
                  id="pet-name"
                  placeholder="Ex: Loup, Corbeau, Élémentaire..."
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pet-hp" className="flex items-center gap-1">
                    <Heart className="w-4 h-4 text-crimson" />
                    Points de vie
                  </Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setPetHp(Math.max(1, petHp - 1))}
                    >
                      -
                    </Button>
                    <Input
                      id="pet-hp"
                      type="number"
                      min={1}
                      value={petHp}
                      onChange={(e) => setPetHp(Math.max(1, parseInt(e.target.value) || 1))}
                      className="text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setPetHp(petHp + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pet-ac" className="flex items-center gap-1">
                    <Shield className="w-4 h-4 text-gold" />
                    Classe d'armure
                  </Label>
                  <Input
                    id="pet-ac"
                    type="number"
                    min={1}
                    placeholder="Optionnel"
                    value={petAc ?? ""}
                    onChange={(e) => setPetAc(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleQuickCreate}
                  disabled={!petName.trim()}
                  className="bg-emerald hover:bg-emerald/80"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Monster Detail View */}
      {viewingMonster && (
        <Dialog open={!!viewingMonster} onOpenChange={() => setViewingMonster(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
            <ScrollArea className="max-h-[75vh]">
              <MonsterDetail monster={viewingMonster} />
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewingMonster(null)}>
                Fermer
              </Button>
              <Button
                className="bg-emerald hover:bg-emerald/80"
                onClick={() => {
                  handleAddFromBestiary(viewingMonster)
                  setViewingMonster(null)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter comme familier
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
