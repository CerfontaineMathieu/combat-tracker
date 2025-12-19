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
  BookOpen,
  Shield,
} from "lucide-react"
import type { CatalogSpell } from "@/lib/types"

// School colors for badges
const schoolColors: Record<string, string> = {
  'Abjuration': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  'Conjuration': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  'Divination': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
  'Enchantement': 'bg-pink-500/20 text-pink-400 border-pink-500/50',
  'Évocation': 'bg-red-500/20 text-red-400 border-red-500/50',
  'Illusion': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  'Nécromancie': 'bg-green-500/20 text-green-400 border-green-500/50',
  'Transmutation': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
}

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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-purple-400">{spell.name}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground italic">
            {getLevelLabel(spell.level)}
          </p>
          {spell.school && (
            <Badge
              variant="outline"
              className={`text-xs ${schoolColors[spell.school] || 'text-muted-foreground border-muted'}`}
            >
              <BookOpen className="w-3 h-3 mr-1" />
              {spell.school}
            </Badge>
          )}
        </div>
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

      {/* Material details (if components include M) */}
      {spell.material_details && (
        <p className="text-xs text-muted-foreground italic pl-6">
          ({spell.material_details})
        </p>
      )}

      {/* Concentration and Saving Throw badges */}
      <div className="flex flex-wrap gap-2">
        {spell.concentration && (
          <Badge
            variant="outline"
            className="text-amber-400 border-amber-500/50"
          >
            <Focus className="w-3 h-3 mr-1" />
            Concentration
          </Badge>
        )}
        {spell.saving_throw && (
          <Badge
            variant="outline"
            className="text-emerald-400 border-emerald-500/50"
          >
            <Shield className="w-3 h-3 mr-1" />
            JdS {spell.saving_throw}
          </Badge>
        )}
      </div>

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
