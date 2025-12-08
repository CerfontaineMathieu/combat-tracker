"use client"

import { useState, ReactNode } from "react"
import { BookOpen, Moon, Sun, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

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

interface SpellSlotManagerProps {
  characterName: string
  spellSlots: Record<number, number>
  maxSpellSlots: Record<number, number>
  isWarlock?: boolean
  onSpellSlotChange: (level: number, delta: number) => void
  onShortRest: () => void
  onLongRest: () => void
  trigger: ReactNode
}

export function SpellSlotManager({
  characterName,
  spellSlots,
  maxSpellSlots,
  isWarlock = false,
  onSpellSlotChange,
  onShortRest,
  onLongRest,
  trigger,
}: SpellSlotManagerProps) {
  const [open, setOpen] = useState(false)

  const hasSpellSlots = Object.keys(maxSpellSlots).length > 0

  // Render spell slot circles (filled/empty)
  const renderSlots = (current: number, max: number, level: number) => {
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: max }).map((_, index) => (
          <button
            key={index}
            className={cn(
              "w-6 h-6 rounded-full border-2 transition-all duration-200",
              "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500/50",
              index < current
                ? "bg-purple-500 border-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.4)]"
                : "bg-transparent border-muted-foreground/40 hover:border-purple-400/60"
            )}
            onClick={() => {
              // Toggle: if filled, use it; if empty, restore it
              if (index < current) {
                onSpellSlotChange(level, -1)
              } else {
                onSpellSlotChange(level, 1)
              }
            }}
            title={index < current ? "Utiliser cet emplacement" : "Restaurer cet emplacement"}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {current}/{max}
        </span>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-purple-400 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Grimoire - {characterName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {!hasSpellSlots ? (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Pas d'emplacements de sort</p>
              <p className="text-xs mt-1 opacity-70">
                Ce personnage n'a pas de sorts configurés dans Notion
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {SPELL_LEVELS.filter(({ level }) => (maxSpellSlots[level] || 0) > 0).map(
                ({ level, name }) => (
                  <div key={level} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm font-medium text-foreground w-24">
                      {name}
                    </span>
                    {renderSlots(
                      spellSlots[level] || 0,
                      maxSpellSlots[level] || 0,
                      level
                    )}
                  </div>
                )
              )}

              {/* Rest buttons */}
              <div className="flex gap-2 pt-4 border-t border-border/50">
                {isWarlock && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50"
                    onClick={() => {
                      onShortRest()
                    }}
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
                    !isWarlock && "w-full"
                  )}
                  onClick={() => {
                    onLongRest()
                  }}
                >
                  <Sun className="w-4 h-4 mr-2" />
                  Repos long
                </Button>
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
