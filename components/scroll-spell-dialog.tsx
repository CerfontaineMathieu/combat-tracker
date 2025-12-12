"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, BookOpen, Loader2, Scroll, Zap, Check } from "lucide-react"
import { SpellDetail } from "./spell-detail"
import type { CatalogSpell, CatalogItem } from "@/lib/types"

interface ScrollSpellDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalogItem: CatalogItem | null
  onConfirm: (item: CatalogItem, spell: CatalogSpell) => void
  onCancel: () => void
}

const SPELL_LEVELS = [
  { value: "all", label: "Tous les niveaux" },
  { value: "0", label: "Tour de magie" },
  { value: "1", label: "Niveau 1" },
  { value: "2", label: "Niveau 2" },
  { value: "3", label: "Niveau 3" },
  { value: "4", label: "Niveau 4" },
  { value: "5", label: "Niveau 5" },
  { value: "6", label: "Niveau 6" },
  { value: "7", label: "Niveau 7" },
  { value: "8", label: "Niveau 8" },
  { value: "9", label: "Niveau 9" },
]

export function ScrollSpellDialog({
  open,
  onOpenChange,
  catalogItem,
  onConfirm,
  onCancel,
}: ScrollSpellDialogProps) {
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState<string>("all")
  const [allSpells, setAllSpells] = useState<CatalogSpell[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSpell, setSelectedSpell] = useState<CatalogSpell | null>(null)
  const [viewingSpell, setViewingSpell] = useState<CatalogSpell | null>(null)

  // Fetch spells from API
  const fetchSpells = useCallback(async (searchQuery: string, levelFilter: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("q", searchQuery)
      if (levelFilter !== "all") params.set("level", levelFilter)

      const response = await fetch(`/api/spells/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setAllSpells(data.spells)
      }
    } catch (error) {
      console.error("Error fetching spells:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearch("")
      setLevel("all")
      setSelectedSpell(null)
      setViewingSpell(null)
      fetchSpells("", "all")
    }
  }, [open, fetchSpells])

  // Debounced fetch when filters change
  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      fetchSpells(search, level)
    }, 300)

    return () => clearTimeout(timer)
  }, [open, search, level, fetchSpells])

  const handleConfirm = () => {
    if (selectedSpell && catalogItem) {
      onConfirm(catalogItem, selectedSpell)
    }
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  const getLevelLabel = (level: number) => {
    if (level === 0) return "Tour de magie"
    return `Niv. ${level}`
  }

  const toggleSpellSelection = (spell: CatalogSpell) => {
    if (selectedSpell?.id === spell.id) {
      setSelectedSpell(null)
    } else {
      setSelectedSpell(spell)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Scroll className="w-5 h-5" />
            Sélectionner le sort du parchemin
          </DialogTitle>
          <DialogDescription>
            {catalogItem && (
              <span className="text-foreground font-medium">{catalogItem.name}</span>
            )}
            {" "}- Choisissez le sort inscrit sur ce parchemin
          </DialogDescription>
        </DialogHeader>

        {viewingSpell ? (
          // Spell detail view
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start mb-2 text-muted-foreground"
              onClick={() => setViewingSpell(null)}
            >
              ← Retour à la liste
            </Button>
            <div className="flex-1 overflow-y-auto pr-2">
              <SpellDetail spell={viewingSpell} />
            </div>
            <Button
              type="button"
              className="w-full mt-4 bg-amber-600 hover:bg-amber-700 shrink-0"
              onClick={() => {
                setSelectedSpell(viewingSpell)
                setViewingSpell(null)
              }}
            >
              <Check className="w-4 h-4 mr-2" />
              Sélectionner ce sort
            </Button>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un sort..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent>
                  {SPELL_LEVELS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected spell indicator */}
            {selectedSpell && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/20 border border-amber-500/50">
                <Check className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-400">
                  Sort sélectionné: {selectedSpell.name} (Niv. {selectedSpell.level})
                </span>
              </div>
            )}

            {/* Results - scrollable area */}
            <div className="flex-1 min-h-0 overflow-y-auto" style={{ maxHeight: '300px' }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : allSpells.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun sort trouvé</p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {allSpells.map((spell) => (
                    <div
                      key={spell.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedSpell?.id === spell.id
                          ? "border-amber-500 bg-amber-500/10"
                          : "border-border hover:border-amber-500/50"
                      }`}
                    >
                      <div
                        className="flex items-center gap-2"
                        onClick={() => toggleSpellSelection(spell)}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          selectedSpell?.id === spell.id
                            ? "border-amber-500 bg-amber-500"
                            : "border-muted-foreground"
                        }`}>
                          {selectedSpell?.id === spell.id && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="font-medium flex-1">{spell.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {getLevelLabel(spell.level)}
                        </Badge>
                        {spell.concentration && (
                          <Badge variant="secondary" className="text-xs text-amber-400">
                            C
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation()
                            setViewingSpell(spell)
                          }}
                        >
                          Détails
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 ml-7">
                        {spell.casting_time && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {spell.casting_time}
                          </span>
                        )}
                        {spell.classes && spell.classes.length > 0 && (
                          <span>• {spell.classes.join(", ")}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Action buttons - always at bottom using DialogFooter */}
        {!viewingSpell && (
          <DialogFooter className="flex gap-2 pt-4 border-t border-border sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleCancel}
            >
              Annuler
            </Button>
            <Button
              type="button"
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={!selectedSpell}
              onClick={handleConfirm}
            >
              <Scroll className="w-4 h-4 mr-2" />
              Ajouter le parchemin
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
