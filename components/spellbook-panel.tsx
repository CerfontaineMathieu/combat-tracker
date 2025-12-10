"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BookOpen,
  Moon,
  Sun,
  Sparkles,
  Plus,
  Wand2,
  X,
  ChevronDown,
  ChevronRight,
  Focus,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { getSocket } from "@/lib/socket"
import { SpellPickerDialog } from "./spell-picker-dialog"
import { SpellDetail } from "./spell-detail"
import type { Character, PreparedSpell, CatalogSpell } from "@/lib/types"

// D&D spell level names in French
const SPELL_LEVELS = [
  { level: 1, name: "Niveau 1" },
  { level: 2, name: "Niveau 2" },
  { level: 3, name: "Niveau 3" },
  { level: 4, name: "Niveau 4" },
  { level: 5, name: "Niveau 5" },
  { level: 6, name: "Niveau 6" },
  { level: 7, name: "Niveau 7" },
  { level: 8, name: "Niveau 8" },
  { level: 9, name: "Niveau 9" },
]

interface SpellbookPanelProps {
  characters: Character[]
  onSpellSlotChange: (characterId: string, level: number, delta: number) => void
  onShortRest: (characterId: string) => void
  onLongRest: (characterId: string) => void
  onCastSpell?: (
    characterId: string,
    spell: CatalogSpell,
    slotLevel: number
  ) => void
  isDm?: boolean
  campaignId?: number
}

export function SpellbookPanel({
  characters,
  onSpellSlotChange,
  onShortRest,
  onLongRest,
  onCastSpell,
  isDm = false,
  campaignId = 1,
}: SpellbookPanelProps) {
  // Prepared spells state per character
  const [preparedSpellsMap, setPreparedSpellsMap] = useState<
    Record<string, PreparedSpell[]>
  >({})
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({})
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(
    new Set()
  )
  const [selectedSpellForDetail, setSelectedSpellForDetail] =
    useState<CatalogSpell | null>(null)
  const [detailCharacterId, setDetailCharacterId] = useState<string | null>(null)

  // Filter to only show characters with spell slots
  const spellcasters = characters.filter((char) => {
    const maxSlots = char.maxSpellSlots || {}
    return Object.keys(maxSlots).length > 0
  })

  // Load prepared spells for all spellcasters
  const loadPreparedSpells = useCallback(
    async (characterId: string) => {
      setLoadingMap((prev) => ({ ...prev, [characterId]: true }))
      try {
        const response = await fetch(
          `/api/characters/${characterId}/prepared-spells?campaignId=${campaignId}`
        )
        const data = await response.json()
        if (data.success) {
          setPreparedSpellsMap((prev) => ({
            ...prev,
            [characterId]: data.preparedSpells,
          }))
        }
      } catch (error) {
        console.error("Error loading prepared spells:", error)
      } finally {
        setLoadingMap((prev) => ({ ...prev, [characterId]: false }))
      }
    },
    [campaignId]
  )

  // Load all prepared spells on mount
  useEffect(() => {
    spellcasters.forEach((char) => {
      if (!preparedSpellsMap[char.id]) {
        loadPreparedSpells(char.id)
      }
    })
  }, [spellcasters.map((c) => c.id).join(","), loadPreparedSpells])

  // Listen for prepared spells changes from other clients
  useEffect(() => {
    const socket = getSocket()

    const handlePreparedSpellsChange = (data: {
      participantId: string
      participantType: "player"
      preparedSpells: PreparedSpell[]
      source: "dm" | "player"
    }) => {
      // Update local state with received prepared spells
      setPreparedSpellsMap((prev) => ({
        ...prev,
        [data.participantId]: data.preparedSpells,
      }))
    }

    socket.on("prepared-spells-change", handlePreparedSpellsChange)

    return () => {
      socket.off("prepared-spells-change", handlePreparedSpellsChange)
    }
  }, [])

  // Add prepared spell
  const handleAddPreparedSpell = async (
    characterId: string,
    spell: CatalogSpell
  ) => {
    try {
      const response = await fetch(
        `/api/characters/${characterId}/prepared-spells`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spellId: spell.id, campaignId }),
        }
      )
      const data = await response.json()
      if (data.success) {
        // Reload prepared spells and emit socket event
        setLoadingMap((prev) => ({ ...prev, [characterId]: true }))
        try {
          const refreshResponse = await fetch(
            `/api/characters/${characterId}/prepared-spells?campaignId=${campaignId}`
          )
          const refreshData = await refreshResponse.json()
          if (refreshData.success) {
            const newPreparedSpells = refreshData.preparedSpells
            setPreparedSpellsMap((prev) => ({
              ...prev,
              [characterId]: newPreparedSpells,
            }))
            // Emit socket event for sync
            const socket = getSocket()
            socket.emit("prepared-spells-change", {
              participantId: characterId,
              participantType: "player" as const,
              preparedSpells: newPreparedSpells,
              source: isDm ? "dm" : "player",
            })
          }
        } finally {
          setLoadingMap((prev) => ({ ...prev, [characterId]: false }))
        }
      }
    } catch (error) {
      console.error("Error adding prepared spell:", error)
    }
  }

  // Remove prepared spell
  const handleRemovePreparedSpell = async (
    characterId: string,
    spellId: number
  ) => {
    try {
      const response = await fetch(
        `/api/characters/${characterId}/prepared-spells`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spellId, campaignId }),
        }
      )
      const data = await response.json()
      if (data.success) {
        // Reload prepared spells and emit socket event
        setLoadingMap((prev) => ({ ...prev, [characterId]: true }))
        try {
          const refreshResponse = await fetch(
            `/api/characters/${characterId}/prepared-spells?campaignId=${campaignId}`
          )
          const refreshData = await refreshResponse.json()
          if (refreshData.success) {
            const newPreparedSpells = refreshData.preparedSpells
            setPreparedSpellsMap((prev) => ({
              ...prev,
              [characterId]: newPreparedSpells,
            }))
            // Emit socket event for sync
            const socket = getSocket()
            socket.emit("prepared-spells-change", {
              participantId: characterId,
              participantType: "player" as const,
              preparedSpells: newPreparedSpells,
              source: isDm ? "dm" : "player",
            })
          }
        } finally {
          setLoadingMap((prev) => ({ ...prev, [characterId]: false }))
        }
      }
    } catch (error) {
      console.error("Error removing prepared spell:", error)
    }
  }

  // Cast a spell (consume slot)
  const handleCastSpell = (
    characterId: string,
    spell: CatalogSpell,
    slotLevel: number
  ) => {
    // Close detail dialog
    setSelectedSpellForDetail(null)
    setDetailCharacterId(null)

    // Consume spell slot (if not a cantrip)
    if (slotLevel > 0) {
      onSpellSlotChange(characterId, slotLevel, -1)
    }

    // Call parent handler if provided
    onCastSpell?.(characterId, spell, slotLevel)
  }

  // Toggle character expansion
  const toggleExpanded = (characterId: string) => {
    setExpandedCharacters((prev) => {
      const next = new Set(prev)
      if (next.has(characterId)) {
        next.delete(characterId)
      } else {
        next.add(characterId)
      }
      return next
    })
  }

  // Render spell slot circles (filled/empty)
  const renderSlots = (
    current: number,
    max: number,
    characterId: string,
    level: number
  ) => {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, index) => (
          <button
            key={index}
            className={cn(
              "w-5 h-5 rounded-full border-2 transition-all duration-200",
              "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500/50",
              index < current
                ? "bg-purple-500 border-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.4)]"
                : "bg-transparent border-muted-foreground/40 hover:border-purple-400/60"
            )}
            onClick={() => {
              // Toggle: if filled, use it; if empty, restore it
              if (index < current) {
                onSpellSlotChange(characterId, level, -1)
              } else {
                onSpellSlotChange(characterId, level, 1)
              }
            }}
            title={
              index < current
                ? "Utiliser cet emplacement"
                : "Restaurer cet emplacement"
            }
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {current}/{max}
        </span>
      </div>
    )
  }

  // Render prepared spells section
  const renderPreparedSpells = (character: Character) => {
    const preparedSpells = preparedSpellsMap[character.id] || []
    const isLoading = loadingMap[character.id]
    const isExpanded = expandedCharacters.has(character.id)
    const excludeIds = preparedSpells.map((ps) => ps.spell_id)

    // Group by level
    const spellsByLevel: Record<number, PreparedSpell[]> = {}
    preparedSpells.forEach((ps) => {
      const level = ps.spell?.level ?? 0
      if (!spellsByLevel[level]) spellsByLevel[level] = []
      spellsByLevel[level].push(ps)
    })

    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(character.id)}>
        <div className="flex items-center justify-between mb-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Sorts prepares ({preparedSpells.length})
            </button>
          </CollapsibleTrigger>
          <SpellPickerDialog
            trigger={
              <Button type="button" variant="ghost" size="sm" className="h-7 px-2 gap-1">
                <Plus className="w-3 h-3" />
                Ajouter
              </Button>
            }
            onSelect={(spell) => handleAddPreparedSpell(character.id, spell)}
            excludeSpellIds={excludeIds}
          />
        </div>

        <CollapsibleContent>
          {isLoading ? (
            <div className="text-xs text-muted-foreground py-2">
              Chargement...
            </div>
          ) : preparedSpells.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">
              Aucun sort prepare
            </div>
          ) : (
            <div className="space-y-1 mb-3">
              {Object.keys(spellsByLevel)
                .map(Number)
                .sort((a, b) => a - b)
                .map((level) => (
                  <div key={level}>
                    <div className="text-xs text-muted-foreground mb-1">
                      {level === 0 ? "Tours de magie" : `Niveau ${level}`}
                    </div>
                    {spellsByLevel[level].map((ps) => (
                      <PreparedSpellCard
                        key={ps.id}
                        preparedSpell={ps}
                        character={character}
                        onViewDetails={() => {
                          if (ps.spell) {
                            setSelectedSpellForDetail(ps.spell)
                            setDetailCharacterId(character.id)
                          }
                        }}
                        onRemove={() =>
                          handleRemovePreparedSpell(character.id, ps.spell_id)
                        }
                      />
                    ))}
                  </div>
                ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  // Character spell slots display
  const renderCharacterSpells = (character: Character) => {
    const maxSlots = character.maxSpellSlots || {}
    const currentSlots = character.spellSlots || {}
    const hasSpells = Object.keys(maxSlots).length > 0

    if (!hasSpells) {
      return (
        <div className="text-center text-muted-foreground py-4">
          <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Pas d'emplacements de sort</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {/* Prepared Spells Section */}
        {renderPreparedSpells(character)}

        {/* Spell Slots Section */}
        <div className="pt-2 border-t border-border/30">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            Emplacements
          </div>
          {SPELL_LEVELS.filter(({ level }) => (maxSlots[level] || 0) > 0).map(
            ({ level, name }) => (
              <div key={level} className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground w-20">
                  {name}
                </span>
                {renderSlots(
                  currentSlots[level] || 0,
                  maxSlots[level] || 0,
                  character.id,
                  level
                )}
              </div>
            )
          )}
        </div>

        {/* Rest buttons */}
        <div className="flex gap-2 pt-3 border-t border-border/30">
          {character.isWarlock && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50"
              onClick={() => onShortRest(character.id)}
            >
              <Moon className="w-4 h-4 mr-2" />
              Repos court
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "flex-1 text-gold border-gold/30 hover:bg-gold/10 hover:border-gold/50",
              !character.isWarlock && "w-full"
            )}
            onClick={() => onLongRest(character.id)}
          >
            <Sun className="w-4 h-4 mr-2" />
            Repos long
          </Button>
        </div>
      </div>
    )
  }

  // Get character for detail dialog
  const detailCharacter = detailCharacterId
    ? characters.find((c) => c.id === detailCharacterId)
    : null

  return (
    <>
      <Card className="bg-card border-border h-full flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="flex items-center gap-2 text-purple-400">
            <BookOpen className="w-5 h-5" />
            Grimoire
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full px-4 md:px-6 pb-6">
            {spellcasters.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Aucun lanceur de sorts</p>
                <p className="text-xs mt-1 opacity-70">
                  Les personnages avec des emplacements de sort apparaitront ici
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {spellcasters.map((character) => (
                  <div
                    key={character.id}
                    className="bg-secondary/30 rounded-lg border border-border/50 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-foreground">
                        {character.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {character.class} Niv. {character.level}
                      </span>
                    </div>
                    {renderCharacterSpells(character)}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Spell detail dialog for casting */}
      <Dialog
        open={!!selectedSpellForDetail}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSpellForDetail(null)
            setDetailCharacterId(null)
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-purple-400">
              {selectedSpellForDetail?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedSpellForDetail && detailCharacter && (
            <div
              className="overflow-y-scroll pr-2 touch-pan-y flex-1"
              style={{
                WebkitOverflowScrolling: 'touch',
                maxHeight: '60vh',
              }}
            >
              <SpellDetail
                spell={selectedSpellForDetail}
                showCastButton
                availableSlots={detailCharacter.spellSlots || {}}
                onCast={(spell, slotLevel) =>
                  handleCastSpell(detailCharacter.id, spell, slotLevel)
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Prepared spell card component
function PreparedSpellCard({
  preparedSpell,
  character,
  onViewDetails,
  onRemove,
}: {
  preparedSpell: PreparedSpell
  character: Character
  onViewDetails: () => void
  onRemove: () => void
}) {
  const spell = preparedSpell.spell
  if (!spell) return null

  return (
    <div
      className="flex items-center gap-2 p-2 rounded bg-secondary/50 mb-1 cursor-pointer hover:bg-secondary/70 transition-colors"
      onClick={onViewDetails}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium truncate">{spell.name}</span>
          {spell.concentration && (
            <Focus className="w-3 h-3 text-amber-400 shrink-0" />
          )}
          {spell.level > 0 && (
            <span className="text-xs text-muted-foreground">Niv.{spell.level}</span>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        title="Retirer des sorts prepares"
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  )
}
