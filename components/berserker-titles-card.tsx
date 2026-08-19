"use client"

import { Check, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { BERSERKER_TITLES, berserkerBuffId } from "@/lib/berserker-titles"
import type { Character, ActiveBuff } from "@/lib/types"

interface BerserkerTitlesCardProps {
  character: Character
  onUpdateBuffs: (characterId: string, buffs: ActiveBuff[]) => void
  onLongRest: (characterId: string) => void
}

export function BerserkerTitlesCard({ character, onUpdateBuffs, onLongRest }: BerserkerTitlesCardProps) {
  const buffs = character.buffs || []

  const toggleTitle = (titleId: string, name: string, boost: string) => {
    const buffId = berserkerBuffId(titleId)
    const isAchieved = buffs.some((b) => b.buffId === buffId)

    const newBuffs: ActiveBuff[] = isAchieved
      ? buffs.filter((b) => b.buffId !== buffId)
      : [
          ...buffs,
          {
            buffId,
            remainingTurns: null,
            customName: name,
            customEffect: boost,
            customType: "buff",
            customColor: "red",
          },
        ]

    onUpdateBuffs(character.id, newBuffs)
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {BERSERKER_TITLES.map((title, index) => {
          const isAchieved = buffs.some((b) => b.buffId === berserkerBuffId(title.id))
          return (
            <button
              key={title.id}
              type="button"
              onClick={() => toggleTitle(title.id, title.name, title.boost)}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all",
                isAchieved
                  ? "bg-red-500/10 border-red-500/50"
                  : "bg-secondary/30 border-border/50 hover:border-red-500/30"
              )}
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    "w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center shrink-0",
                    isAchieved ? "border-red-500 bg-red-500" : "border-muted-foreground"
                  )}
                >
                  {isAchieved && <Check className="w-3 h-3 text-background" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isAchieved ? "text-red-400" : "text-foreground"
                    )}
                  >
                    #{index + 1} {title.name}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">{title.condition}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      isAchieved ? "text-red-300" : "text-muted-foreground/70"
                    )}
                  >
                    {title.boost}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full text-gold border-gold/30 hover:bg-gold/10 hover:border-gold/50"
        onClick={() => onLongRest(character.id)}
      >
        <Sun className="w-4 h-4 mr-2" />
        Repos long
      </Button>
    </div>
  )
}
