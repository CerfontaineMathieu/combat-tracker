"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, BookOpen, Loader2, Sparkles, Zap, Shield } from "lucide-react"
import { SpellDetail } from "./spell-detail"
import type { CatalogSpell } from "@/lib/types"

interface SpellReferenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

const SAVE_TYPES = [
  { value: "all", label: "Tous les JdS" },
  { value: "FOR", label: "FOR" },
  { value: "DEX", label: "DEX" },
  { value: "CON", label: "CON" },
  { value: "INT", label: "INT" },
  { value: "SAG", label: "SAG" },
  { value: "CHA", label: "CHA" },
]

export function SpellReferenceDialog({
  open,
  onOpenChange,
}: SpellReferenceDialogProps) {
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState<string>("all")
  const [saveType, setSaveType] = useState<string>("all")
  const [spells, setSpells] = useState<CatalogSpell[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSpell, setSelectedSpell] = useState<CatalogSpell | null>(null)

  // Fetch spells from API
  const fetchSpells = useCallback(async (
    searchQuery: string,
    levelFilter: string,
    saveFilter: string
  ) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("q", searchQuery)
      if (levelFilter !== "all") params.set("level", levelFilter)
      if (saveFilter !== "all") params.set("save", saveFilter)

      const response = await fetch(`/api/spells/search?${params}`)
      const data = await response.json()

      if (data.success) {
        setSpells(data.spells)
      }
    } catch (error) {
      console.error("Error fetching spells:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on dialog open
  useEffect(() => {
    if (open) {
      // Reset state
      setSearch("")
      setLevel("all")
      setSaveType("all")
      setSelectedSpell(null)
      // Fetch with initial values
      fetchSpells("", "all", "all")
    }
  }, [open, fetchSpells])

  // Debounced fetch when filters change
  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      fetchSpells(search, level, saveType)
    }, 300)

    return () => clearTimeout(timer)
  }, [open, search, level, saveType, fetchSpells])

  const getLevelLabel = (level: number) => {
    if (level === 0) return "Tour de magie"
    return `Niv. ${level}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-400">
            <Sparkles className="w-5 h-5" />
            Catalogue des Sorts
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un sort..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                // Return to list view when searching
                if (selectedSpell) setSelectedSpell(null)
              }}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={level} onValueChange={(val) => {
              setLevel(val)
              // Return to list view when filtering
              if (selectedSpell) setSelectedSpell(null)
            }}>
              <SelectTrigger>
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
            <Select value={saveType} onValueChange={(val) => {
              setSaveType(val)
              // Return to list view when filtering
              if (selectedSpell) setSelectedSpell(null)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="JdS" />
              </SelectTrigger>
              <SelectContent>
                {SAVE_TYPES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        {!loading && spells.length > 0 && !selectedSpell && (
          <p className="text-sm text-muted-foreground">
            {spells.length} sort(s) trouvé(s)
          </p>
        )}

        {/* Results */}
        <div className="flex-1 min-h-0 mt-2">
          {selectedSpell ? (
            // Show spell detail when selected
            <div className="flex flex-col h-full">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="self-start mb-2 text-muted-foreground"
                onClick={() => setSelectedSpell(null)}
              >
                ← Retour à la liste
              </Button>
              <div
                className="overflow-y-scroll pr-2 touch-pan-y"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  height: '45vh',
                  minHeight: '200px',
                }}
              >
                <SpellDetail spell={selectedSpell} />
              </div>
            </div>
          ) : (
            // Show spell list
            <ScrollArea className="h-[350px]">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : spells.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun sort trouvé</p>
                  <p className="text-xs mt-1">
                    Synchronisez d'abord les sorts depuis Notion
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {spells.map((spell) => (
                    <div
                      key={spell.id}
                      onClick={() => setSelectedSpell(spell)}
                      className="p-3 rounded-lg border border-border hover:border-purple-500/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{spell.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {getLevelLabel(spell.level)}
                        </Badge>
                        {spell.concentration && (
                          <Badge
                            variant="secondary"
                            className="text-xs text-amber-400"
                          >
                            C
                          </Badge>
                        )}
                        {spell.saving_throw && (
                          <Badge
                            variant="secondary"
                            className="text-xs text-emerald-400"
                          >
                            <Shield className="w-3 h-3 mr-0.5" />
                            {spell.saving_throw}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        {spell.casting_time && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {spell.casting_time}
                          </span>
                        )}
                        <span>• {spell.classes?.join(", ")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
