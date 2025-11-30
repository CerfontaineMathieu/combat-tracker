"use client"

import { useState, useEffect } from "react"
import { Search, Database, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { MonsterDetail } from "@/components/monster-detail"
import type { DbMonster } from "@/lib/types"

interface MonsterDatabaseProps {
  onAddToCombat?: (monster: DbMonster) => void
}

export function MonsterDatabase({ onAddToCombat }: MonsterDatabaseProps) {
  const [monsters, setMonsters] = useState<DbMonster[]>([])
  const [filteredMonsters, setFilteredMonsters] = useState<DbMonster[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMonster, setSelectedMonster] = useState<DbMonster | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Database className="w-6 h-6 animate-pulse mr-2" />
        Chargement du bestiaire...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Database className="w-12 h-12 opacity-30 mb-3" />
        <p className="text-crimson">{error}</p>
        <p className="text-sm">Vérifiez que la base de données est accessible</p>
      </div>
    )
  }

  // List view
  return (
    <>
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un monstre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-background"
        />
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground mb-2">
        {filteredMonsters.length} monstre{filteredMonsters.length !== 1 ? "s" : ""} trouvé{filteredMonsters.length !== 1 ? "s" : ""}
      </div>

      {/* Monster list */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 pr-2">
          {filteredMonsters.map((monster) => (
            <button
              key={monster.id}
              onClick={() => setSelectedMonster(monster)}
              className="w-full text-left p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 border border-transparent hover:border-gold/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {monster.image_url && (
                    <div className="w-8 h-8 rounded overflow-hidden border border-border shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={monster.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-sm">{monster.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {monster.creature_type}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs border-crimson/30 text-crimson">
                    PV {monster.hit_points}
                  </Badge>
                  <Badge variant="outline" className="text-xs border-gold/30 text-gold">
                    CA {monster.armor_class}
                  </Badge>
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>

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
          {onAddToCombat && selectedMonster && (
            <Button
              className="bg-crimson hover:bg-crimson/80"
              onClick={() => {
                onAddToCombat(selectedMonster)
                setSelectedMonster(null)
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter au combat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
