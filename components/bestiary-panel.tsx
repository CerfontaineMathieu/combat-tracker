"use client"

import { useState, useEffect } from "react"
import { Skull, Plus, Minus, Search, Database } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MonsterDetail } from "@/components/monster-detail"
import type { DbMonster } from "@/lib/types"

interface BestiaryPanelProps {
  onAddMonsterToCombat?: (dbMonster: DbMonster, quantity: number) => void
  mode: "mj" | "joueur"
}

export function BestiaryPanel({ onAddMonsterToCombat, mode }: BestiaryPanelProps) {
  const [monsters, setMonsters] = useState<DbMonster[]>([])
  const [filteredMonsters, setFilteredMonsters] = useState<DbMonster[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMonster, setSelectedMonster] = useState<DbMonster | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Quantity dialog state
  const [quantityDialogMonster, setQuantityDialogMonster] = useState<DbMonster | null>(null)
  const [quantity, setQuantity] = useState(1)

  // Fetch monsters from API
  useEffect(() => {
    async function fetchMonsters() {
      try {
        setLoading(true)
        const response = await fetch("/api/monsters")
        if (!response.ok) {
          throw new Error("Failed to fetch monsters")
        }
        const data = await response.json()
        setMonsters(data)
        setFilteredMonsters(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading monsters")
      } finally {
        setLoading(false)
      }
    }
    fetchMonsters()
  }, [])

  // Filter monsters based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMonsters(monsters)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredMonsters(
        monsters.filter(
          (m) =>
            m.name.toLowerCase().includes(query) ||
            m.creature_type?.toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, monsters])

  // Handle opening quantity dialog
  const handleAddClick = (monster: DbMonster, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setQuantityDialogMonster(monster)
    setQuantity(1)
  }

  // Confirm adding monster(s) to combat
  const handleConfirmAdd = () => {
    if (quantityDialogMonster && onAddMonsterToCombat && quantity > 0) {
      onAddMonsterToCombat(quantityDialogMonster, quantity)
      setQuantityDialogMonster(null)
      setQuantity(1)
      // Go back to list view if we were in detail view
      setSelectedMonster(null)
    }
  }

  // Players should not see the bestiary at all
  if (mode === "joueur") {
    return null
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
        {loading ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Database className="w-6 h-6 animate-pulse mr-2" />
            Chargement du bestiaire...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Database className="w-12 h-12 opacity-30 mb-3" />
            <p className="text-crimson">{error}</p>
            <p className="text-sm">Vérifiez que la base de données est accessible</p>
          </div>
        ) : (
          // List view
          <div className="h-full flex flex-col">
            {/* Search */}
            <div className="relative mb-3 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un monstre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background min-h-[44px]"
              />
            </div>

            {/* Results count */}
            <div className="text-xs text-muted-foreground mb-2 shrink-0">
              {filteredMonsters.length} monstre{filteredMonsters.length !== 1 ? "s" : ""} trouvé{filteredMonsters.length !== 1 ? "s" : ""}
            </div>

            {/* Monster list */}
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {filteredMonsters.map((monster) => (
                  <div
                    key={monster.id}
                    onClick={() => setSelectedMonster(monster)}
                    className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 border border-transparent hover:border-gold/30 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      {/* Hide image on mobile to save space */}
                      {monster.image_url && (
                        <div className="w-10 h-10 rounded overflow-hidden border border-border shrink-0 hidden sm:block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={monster.image_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{monster.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs border-crimson/30 text-crimson px-1.5 py-0">
                            PV {monster.hit_points}
                          </Badge>
                          <Badge variant="outline" className="text-xs border-gold/30 text-gold px-1.5 py-0">
                            CA {monster.armor_class}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {monster.creature_type}
                          </span>
                        </div>
                      </div>
                      {onAddMonsterToCombat && (
                        <Button
                          size="icon"
                          className="h-10 w-10 shrink-0 bg-crimson hover:bg-crimson/80"
                          onClick={(e) => handleAddClick(monster, e)}
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>

      {/* Monster Detail Modal */}
      <Dialog open={!!selectedMonster} onOpenChange={(open) => !open && setSelectedMonster(null)}>
        <DialogContent className="bg-card border-border !max-w-3xl w-[95vw] sm:!max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b border-border">
            <DialogTitle className="text-gold text-xl">
              {selectedMonster?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedMonster && <MonsterDetail monster={selectedMonster} />}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
            <Button variant="ghost" onClick={() => setSelectedMonster(null)}>
              Fermer
            </Button>
            {onAddMonsterToCombat && selectedMonster && (
              <Button
                className="bg-crimson hover:bg-crimson/80"
                onClick={() => handleAddClick(selectedMonster)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter au combat
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quantity Dialog */}
      <Dialog open={!!quantityDialogMonster} onOpenChange={(open) => !open && setQuantityDialogMonster(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-crimson">
              Ajouter {quantityDialogMonster?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="text-4xl font-bold w-16 text-center">{quantity}</div>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setQuantity(Math.min(20, quantity + 1))}
                disabled={quantity >= 20}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            {quantityDialogMonster && (
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <p>PV: {quantityDialogMonster.hit_points} | CA: {quantityDialogMonster.armor_class}</p>
                {quantityDialogMonster.challenge_rating_xp && (
                  <p className="mt-1">XP: {quantityDialogMonster.challenge_rating_xp * quantity}</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setQuantityDialogMonster(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleConfirmAdd}
              className="bg-crimson hover:bg-crimson/80"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter {quantity}x
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
