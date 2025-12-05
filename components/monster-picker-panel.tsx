"use client"

import { useState, useEffect } from "react"
import { useDraggable } from "@dnd-kit/core"
import { Search, Database, Plus, Minus, GripVertical, Eye, MousePointer } from "lucide-react"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { MonsterDetail } from "@/components/monster-detail"
import { cn } from "@/lib/utils"
import type { DbMonster } from "@/lib/types"

interface DraggableDbMonsterCardProps {
  monster: DbMonster
  onAddClick: (monster: DbMonster, e: React.MouseEvent) => void
  onViewClick: (monster: DbMonster) => void
}

function DraggableDbMonsterCard({ monster, onAddClick, onViewClick }: DraggableDbMonsterCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `drag-dbmonster-${monster.id}`,
    data: { monster },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isMobileDevice ? {} : { ...attributes, ...listeners })}
      className={cn(
        "group w-full text-left p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 border-2 transition-all select-none",
        isDragging
          ? "opacity-50 border-crimson/50 z-50"
          : "border-transparent hover:border-crimson/30",
        !isMobileDevice && "touch-none cursor-grab active:cursor-grabbing"
      )}
    >
      <div className="flex items-center gap-2">
        {/* Drag Handle - visible on hover, hidden on mobile */}
        <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Monster Info */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Hide image on mobile to save space */}
          {monster.image_url && (
            <div className="w-8 h-8 rounded overflow-hidden border border-border shrink-0 hidden sm:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={monster.image_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm truncate">{monster.name}</div>
            <div className="text-xs text-muted-foreground truncate">
              {monster.creature_type}
            </div>
          </div>
        </div>

        {/* Stats and Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="outline" className="text-xs border-crimson/30 text-crimson hidden sm:flex">
            PV {monster.hit_points}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
            onClick={(e) => {
              e.stopPropagation()
              onViewClick(monster)
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            className="h-9 w-9 bg-crimson hover:bg-crimson/80 text-white"
            onClick={(e) => {
              e.stopPropagation()
              onAddClick(monster, e)
            }}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface MonsterPickerPanelProps {
  onAddMonsters: (monster: DbMonster, quantity: number) => void
  refreshKey?: number
}

export function MonsterPickerPanel({ onAddMonsters, refreshKey }: MonsterPickerPanelProps) {
  const isMobile = useIsMobile()
  const [monsters, setMonsters] = useState<DbMonster[]>([])
  const [filteredMonsters, setFilteredMonsters] = useState<DbMonster[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMonster, setSelectedMonster] = useState<DbMonster | null>(null)
  const [quantityDialogMonster, setQuantityDialogMonster] = useState<DbMonster | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch monsters from API (re-fetches when refreshKey changes)
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
  }, [refreshKey])

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

  const handleAddClick = (monster: DbMonster, e: React.MouseEvent) => {
    e.stopPropagation()
    setQuantityDialogMonster(monster)
    setQuantity(1)
  }

  const handleConfirmAdd = () => {
    if (quantityDialogMonster && quantity > 0) {
      onAddMonsters(quantityDialogMonster, quantity)
      setQuantityDialogMonster(null)
      setQuantity(1)
    }
  }

  if (loading) {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-crimson">
            <Database className="w-5 h-5" />
            Bestiaire
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground flex items-center">
            <Database className="w-6 h-6 animate-pulse mr-2" />
            Chargement...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-crimson">
            <Database className="w-5 h-5" />
            Bestiaire
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Database className="w-12 h-12 opacity-30 mb-3" />
          <p className="text-crimson">{error}</p>
        </CardContent>
      </Card>
    )
  }

  // Quantity Dialog - rendered always so it works from both views
  const quantityDialog = (
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
  )

  // Monster Detail Modal
  const monsterDetailDialog = (
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
          {selectedMonster && (
            <Button
              className="bg-crimson hover:bg-crimson/80"
              onClick={(e) => handleAddClick(selectedMonster, e)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajouter au combat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  // List view
  return (
    <>
      {quantityDialog}
      {monsterDetailDialog}
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-crimson">
            <Database className="w-5 h-5" />
            Bestiaire
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col p-0 px-6 pb-6">
          {/* Search */}
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un monstre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background"
            />
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground mb-2 shrink-0 flex items-center gap-1">
            {isMobile ? (
              <>
                <MousePointer className="w-3 h-3" />
                Cliquez + pour ajouter
              </>
            ) : (
              <>
                <GripVertical className="w-3 h-3" />
                Glissez ou cliquez + pour ajouter
              </>
            )}
          </p>

          {/* Monster list */}
          <ScrollArea className="flex-1">
            <div className="space-y-1 pr-2">
              {filteredMonsters.map((monster) => (
                <DraggableDbMonsterCard
                  key={monster.id}
                  monster={monster}
                  onAddClick={handleAddClick}
                  onViewClick={setSelectedMonster}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  )
}
