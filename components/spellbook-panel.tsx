"use client"

import { BookOpen, Moon, Sun, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { Character } from "@/lib/types"

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
  isDm?: boolean
}

export function SpellbookPanel({
  characters,
  onSpellSlotChange,
  onShortRest,
  onLongRest,
  isDm = false,
}: SpellbookPanelProps) {
  // Filter to only show characters with spell slots
  const spellcasters = characters.filter((char) => {
    const maxSlots = char.maxSpellSlots || {}
    return Object.keys(maxSlots).length > 0
  })

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
            title={index < current ? "Utiliser cet emplacement" : "Restaurer cet emplacement"}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {current}/{max}
        </span>
      </div>
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
        {SPELL_LEVELS.filter(({ level }) => (maxSlots[level] || 0) > 0).map(
          ({ level, name }) => (
            <div key={level} className="flex items-center justify-between">
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

        {/* Rest buttons */}
        <div className="flex gap-2 pt-3 border-t border-border/30">
          {character.isWarlock && (
            <Button
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

  return (
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
  )
}
