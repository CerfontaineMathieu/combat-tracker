"use client"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { DiceRoll } from "@/lib/types"
import { toast } from "sonner"

interface DiceRollerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoll: (sides: number) => number
  history: DiceRoll[]
}

const DICE_TYPES = [
  { sides: 4, color: "bg-emerald/20 hover:bg-emerald/30 border-emerald/50 text-emerald" },
  { sides: 6, color: "bg-gold/20 hover:bg-gold/30 border-gold/50 text-gold" },
  { sides: 8, color: "bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-400" },
  { sides: 10, color: "bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50 text-purple-400" },
  { sides: 12, color: "bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-400" },
  { sides: 20, color: "bg-crimson/20 hover:bg-crimson/30 border-crimson/50 text-crimson" },
]

function DiceContent({ onRoll, history }: { onRoll: (sides: number) => number; history: DiceRoll[] }) {
  const handleRoll = (sides: number) => {
    const result = onRoll(sides)
    const isCritical = sides === 20 && result === 20
    const isFumble = sides === 20 && result === 1

    if (isCritical) {
      toast.success(`d${sides}: ${result} - Critique!`, { duration: 3000 })
    } else if (isFumble) {
      toast.error(`d${sides}: ${result} - Échec critique!`, { duration: 3000 })
    } else {
      toast(`d${sides}: ${result}`, { duration: 2000 })
    }
  }

  return (
    <div className="space-y-4 p-4">
      {/* Dice Buttons */}
      <div className="grid grid-cols-3 gap-3">
        {DICE_TYPES.map(({ sides, color }) => (
          <Button
            key={sides}
            variant="outline"
            onClick={() => handleRoll(sides)}
            className={cn(
              "h-14 min-h-[48px] text-lg font-bold transition-smooth",
              color,
              "active:scale-95 active:animate-dice-roll"
            )}
          >
            d{sides}
          </Button>
        ))}
      </div>

      {/* History */}
      <div>
        <h4 className="text-sm font-medium text-muted-foreground mb-2">Historique</h4>
        <div className="space-y-1 max-h-48 overflow-auto">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">Aucun lancer</p>
          ) : (
            history.map((roll, index) => (
              <div
                key={roll.id}
                className={cn(
                  "flex items-center justify-between p-2 bg-secondary/30 rounded-lg",
                  index === 0 && "animate-slide-down"
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border">
                    {roll.dice}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{roll.timestamp}</span>
                </div>
                <span
                  className={cn(
                    "text-lg font-bold",
                    roll.isCritical && "text-gold animate-pulse-gold",
                    roll.isFumble && "text-crimson animate-shake",
                    !roll.isCritical && !roll.isFumble && "text-foreground"
                  )}
                >
                  {roll.result}
                  {roll.isCritical && " ✨"}
                  {roll.isFumble && " 💀"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function DiceRoller({ open, onOpenChange, onRoll, history }: DiceRollerProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-gold">Lancer de dés</DrawerTitle>
          </DrawerHeader>
          <DiceContent onRoll={onRoll} history={history} />
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80">
        <SheetHeader>
          <SheetTitle className="text-gold">Lancer de dés</SheetTitle>
        </SheetHeader>
        <DiceContent onRoll={onRoll} history={history} />
      </SheetContent>
    </Sheet>
  )
}
