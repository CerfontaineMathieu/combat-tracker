"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Zap,
  Target,
  Hourglass,
  Sparkles,
  Focus,
  Wand2,
} from "lucide-react"
import type { CatalogSpell } from "@/lib/types"

interface SpellDetailProps {
  spell: CatalogSpell
  onCast?: (spell: CatalogSpell, slotLevel: number) => void
  availableSlots?: Record<number, number>  // {1: 4, 2: 3, ...}
  showCastButton?: boolean
}

export function SpellDetail({
  spell,
  onCast,
  availableSlots,
  showCastButton = false,
}: SpellDetailProps) {
  const getLevelLabel = (level: number) => {
    if (level === 0) return "Tour de magie"
    return `Sort de niveau ${level}`
  }

  // Parse components to show icons
  const hasVerbal = spell.components?.toUpperCase().includes("V")
  const hasSomatic = spell.components?.toUpperCase().includes("S")
  const hasMaterial = spell.components?.toUpperCase().includes("M")

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-purple-400">{spell.name}</h3>
        <p className="text-sm text-muted-foreground italic">
          {getLevelLabel(spell.level)}
        </p>
      </div>

      {/* Action type - prominent display */}
      {spell.casting_time && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-purple-500/10 border border-purple-500/30">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">{spell.casting_time}</span>
        </div>
      )}

      {/* Quick info */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {spell.range && (
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <span>{spell.range}</span>
          </div>
        )}
        {spell.duration && (
          <div className="flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-muted-foreground" />
            <span>{spell.duration}</span>
          </div>
        )}
        {spell.components && (
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span>{spell.components}</span>
          </div>
        )}
      </div>

      {/* Component badges */}
      <div className="flex gap-1">
        {hasVerbal && (
          <Badge variant="outline" className="text-xs">
            V
          </Badge>
        )}
        {hasSomatic && (
          <Badge variant="outline" className="text-xs">
            S
          </Badge>
        )}
        {hasMaterial && (
          <Badge variant="outline" className="text-xs">
            M
          </Badge>
        )}
      </div>

      {/* Concentration badge */}
      {spell.concentration && (
        <Badge
          variant="outline"
          className="text-amber-400 border-amber-500/50"
        >
          <Focus className="w-3 h-3 mr-1" />
          Concentration
        </Badge>
      )}

      <Separator />

      {/* Description */}
      {spell.description && (
        <div className="text-sm prose prose-sm prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{spell.description}</p>
        </div>
      )}

      {/* Higher levels */}
      {spell.higher_levels && (
        <div className="text-sm">
          <p className="font-medium text-purple-400 mb-1">
            Aux niveaux superieurs
          </p>
          <p className="text-muted-foreground">{spell.higher_levels}</p>
        </div>
      )}

      {/* Classes */}
      {spell.classes && spell.classes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {spell.classes.map((cls) => (
            <Badge key={cls} variant="secondary" className="text-xs">
              {cls}
            </Badge>
          ))}
        </div>
      )}

      {/* Cast button (if enabled) */}
      {showCastButton && onCast && spell.level > 0 && availableSlots && (
        <CastSpellSection
          spell={spell}
          availableSlots={availableSlots}
          onCast={onCast}
        />
      )}

      {/* Cantrip cast button (no slot needed) */}
      {showCastButton && onCast && spell.level === 0 && (
        <Button
          type="button"
          className="w-full bg-purple-600 hover:bg-purple-700"
          onClick={() => onCast(spell, 0)}
        >
          <Wand2 className="w-4 h-4 mr-2" />
          Lancer le tour de magie
        </Button>
      )}
    </div>
  )
}

// Sub-component for casting spells that require slots
function CastSpellSection({
  spell,
  availableSlots,
  onCast,
}: {
  spell: CatalogSpell
  availableSlots: Record<number, number>
  onCast: (spell: CatalogSpell, slotLevel: number) => void
}) {
  const [selectedLevel, setSelectedLevel] = useState(spell.level.toString())

  // Available levels for upcasting (spell level and higher, with available slots)
  const availableLevels = Object.entries(availableSlots)
    .filter(([level, count]) => parseInt(level) >= spell.level && count > 0)
    .map(([level]) => parseInt(level))
    .sort((a, b) => a - b)

  if (availableLevels.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-2">
        Aucun emplacement disponible
      </p>
    )
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <div className="flex items-center gap-2">
        <span className="text-sm">Lancer au niveau:</span>
        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableLevels.map((level) => (
              <SelectItem key={level} value={level.toString()}>
                Niveau {level} ({availableSlots[level]} dispo)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        className="w-full bg-purple-600 hover:bg-purple-700"
        onClick={() => onCast(spell, parseInt(selectedLevel))}
      >
        <Wand2 className="w-4 h-4 mr-2" />
        Lancer le sort
      </Button>
    </div>
  )
}
