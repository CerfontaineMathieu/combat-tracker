"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Search, Skull, ChevronLeft, Heart, Shield, Zap, ChevronDown, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import { MonsterDetail } from "@/components/monster-detail"
import { cn } from "@/lib/utils"
import { xpToChallengeRating } from "@/lib/challenge-rating"
import type { DbMonster } from "@/lib/types"

function toggleInArray<T>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((v) => v !== value) : [...values, value]
}

function summarizeSelection(count: number, allLabel: string, unit: string): string {
  if (count === 0) return allLabel
  if (count <= 2) return `${count} ${unit}`
  return `${count} ${unit} sélectionnés`
}

export default function MonstersPage() {
  const [monsters, setMonsters] = useState<DbMonster[]>([])
  const [filteredMonsters, setFilteredMonsters] = useState<DbMonster[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [creatureTypeFilters, setCreatureTypeFilters] = useState<string[]>([])
  const [habitatFilters, setHabitatFilters] = useState<string[]>([])
  const [crFilters, setCrFilters] = useState<number[]>([])
  const [habitatOptions, setHabitatOptions] = useState<string[]>([])
  const [selectedMonster, setSelectedMonster] = useState<DbMonster | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch monsters from API
  const fetchMonsters = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/monsters")
      if (!response.ok) {
        throw new Error("Failed to fetch monsters")
      }
      const data = await response.json()
      setMonsters(data)
      setFilteredMonsters(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading monsters")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMonsters()
  }, [])

  useEffect(() => {
    async function fetchHabitats() {
      try {
        const response = await fetch("/api/monsters/habitats")
        if (!response.ok) throw new Error("Failed to fetch habitats")
        setHabitatOptions(await response.json())
      } catch {
        // Non-critical: habitat filter simply stays empty
      }
    }
    fetchHabitats()
  }, [])

  const creatureTypes = useMemo(
    () => [...new Set(monsters.map((m) => m.creature_type).filter((t): t is string => !!t))].sort(),
    [monsters]
  )

  const crOptions = useMemo(() => {
    const xps = [...new Set(monsters.map((m) => m.challenge_rating_xp).filter((xp): xp is number => xp != null))]
    return xps.sort((a, b) => a - b).map((xp) => ({ xp, label: xpToChallengeRating(xp) }))
  }, [monsters])

  const hasActiveFilters =
    searchQuery.trim() !== "" || creatureTypeFilters.length > 0 || habitatFilters.length > 0 || crFilters.length > 0

  const resetFilters = () => {
    setSearchQuery("")
    setCreatureTypeFilters([])
    setHabitatFilters([])
    setCrFilters([])
  }

  // Filter monsters based on search query and selected filters
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase()
    const typeSet = new Set(creatureTypeFilters.map((t) => t.toLowerCase()))
    const habitatSet = new Set(habitatFilters.map((h) => h.toLowerCase()))
    const crSet = new Set(crFilters)

    setFilteredMonsters(
      monsters.filter((m) => {
        if (query && !m.name.toLowerCase().includes(query) && !m.creature_type?.toLowerCase().includes(query)) {
          return false
        }
        if (typeSet.size > 0 && !(m.creature_type && typeSet.has(m.creature_type.toLowerCase()))) {
          return false
        }
        if (habitatSet.size > 0 && !m.habitat?.some((h) => habitatSet.has(h.toLowerCase()))) {
          return false
        }
        if (crSet.size > 0 && !(m.challenge_rating_xp != null && crSet.has(m.challenge_rating_xp))) {
          return false
        }
        return true
      })
    )
  }, [searchQuery, creatureTypeFilters, habitatFilters, crFilters, monsters])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-fade-in">
        <div className="text-center text-muted-foreground">
          <Skull className="w-12 h-12 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Chargement du bestiaire...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center animate-fade-in">
        <div className="text-center text-muted-foreground px-4">
          <Skull className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg text-crimson">{error}</p>
          <p className="text-sm mt-2">Assurez-vous que la base de données est accessible</p>
          <Link href="/">
            <Button variant="outline" className="mt-4 min-h-[44px]">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Retour au combat
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] text-muted-foreground hover:text-foreground transition-smooth"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Combat</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-crimson" />
            <h1 className="text-xl font-bold text-gold">Bestiaire</h1>
          </div>
          <div className="w-16" /> {/* Spacer for alignment */}
        </div>
      </header>

      <main className="container mx-auto p-4 animate-fade-in">
        {/* Search */}
        <div className="max-w-md mx-auto mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher un monstre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card text-lg min-h-[48px]"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="max-w-3xl mx-auto mb-6 flex flex-wrap items-center justify-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-h-[44px] font-normal justify-between gap-2">
                {summarizeSelection(creatureTypeFilters.length, "Tous les types", "types")}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-72 overflow-y-auto">
              {creatureTypes.map((type) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={creatureTypeFilters.includes(type)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => setCreatureTypeFilters((prev) => toggleInArray(prev, type))}
                >
                  {type}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-h-[44px] font-normal justify-between gap-2">
                {summarizeSelection(habitatFilters.length, "Tous les habitats", "habitats")}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-72 overflow-y-auto">
              {habitatOptions.map((habitat) => (
                <DropdownMenuCheckboxItem
                  key={habitat}
                  checked={habitatFilters.includes(habitat)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => setHabitatFilters((prev) => toggleInArray(prev, habitat))}
                >
                  {habitat}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-h-[44px] font-normal justify-between gap-2">
                {summarizeSelection(crFilters.length, "Tous les FP", "FP")}
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-72 overflow-y-auto">
              {crOptions.map(({ xp, label }) => (
                <DropdownMenuCheckboxItem
                  key={xp}
                  checked={crFilters.includes(xp)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={() => setCrFilters((prev) => toggleInArray(prev, xp))}
                >
                  FP {label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="min-h-[44px] text-muted-foreground" onClick={resetFilters}>
              <X className="w-4 h-4 mr-1" />
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="text-center text-muted-foreground mb-4">
          {filteredMonsters.length} monstre{filteredMonsters.length !== 1 ? "s" : ""} trouvé
          {filteredMonsters.length !== 1 ? "s" : ""}
        </div>

        {/* Monster Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredMonsters.map((monster, index) => (
            <Card
              key={monster.id}
              className={cn(
                "bg-card border-border hover:border-gold/50 transition-smooth cursor-pointer group active:scale-[0.98]",
                index < 4 && "animate-fade-in"
              )}
              onClick={() => setSelectedMonster(monster)}
            >
              <CardContent className="p-0">
                {/* Monster Image - prefer ai_generated, fallback to image_url */}
                {monster.ai_generated || monster.image_url ? (
                  <div className="relative aspect-square overflow-hidden rounded-t-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={monster.ai_generated || monster.image_url || ""}
                      alt={monster.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <h3 className="absolute bottom-2 left-2 right-2 text-sm sm:text-lg font-bold text-white line-clamp-2">
                      {monster.name}
                    </h3>
                  </div>
                ) : (
                  <div className="aspect-square bg-secondary/30 rounded-t-lg flex items-center justify-center relative">
                    <Skull className="w-12 sm:w-16 h-12 sm:h-16 text-muted-foreground/30" />
                    <h3 className="absolute bottom-2 left-2 right-2 text-sm sm:text-lg font-bold text-foreground line-clamp-2">
                      {monster.name}
                    </h3>
                  </div>
                )}

                {/* Monster Stats */}
                <div className="p-2 sm:p-3 space-y-2">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">
                    {monster.creature_type}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-0.5 text-crimson">
                      <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">
                        {monster.hit_points ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-gold">
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">
                        {monster.armor_class ?? "-"}
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-emerald">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm font-medium">{monster.speed ?? "-"}</span>
                    </div>
                  </div>
                  {monster.challenge_rating_xp && (
                    <Badge variant="outline" className="text-xs border-crimson/30 text-crimson">
                      {monster.challenge_rating_xp} XP
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Monster Detail - Centered Modal */}
      <Dialog open={!!selectedMonster} onOpenChange={(open) => !open && setSelectedMonster(null)}>
        <DialogContent className="bg-card border-border !max-w-4xl w-[95vw] sm:!max-w-4xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b border-border">
            <DialogTitle className="text-gold text-xl">
              {selectedMonster?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedMonster && <MonsterDetail monster={selectedMonster} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
