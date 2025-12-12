"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Dice6, Trophy, Sparkles } from "lucide-react"
import type { RollOffResult } from "@/lib/types"
import { cn } from "@/lib/utils"

interface RollOffDialogProps {
  isOpen: boolean
  itemName: string
  participants: Array<{ characterId: string; characterName: string }>
  result: RollOffResult | null
  onClose: () => void
}

export function RollOffDialog({
  isOpen,
  itemName,
  participants,
  result,
  onClose,
}: RollOffDialogProps) {
  const [rolling, setRolling] = useState(false)
  const [displayedRolls, setDisplayedRolls] = useState<Record<string, number>>({})
  const [showWinner, setShowWinner] = useState(false)

  // Animation sequence
  useEffect(() => {
    if (!isOpen) {
      setRolling(false)
      setDisplayedRolls({})
      setShowWinner(false)
      return
    }

    // Start rolling animation
    setRolling(true)
    setShowWinner(false)

    // Animate dice rolling
    const rollInterval = setInterval(() => {
      const newRolls: Record<string, number> = {}
      participants.forEach(p => {
        newRolls[p.characterId] = Math.floor(Math.random() * 20) + 1
      })
      setDisplayedRolls(newRolls)
    }, 100)

    // Stop animation when result arrives
    if (result) {
      setTimeout(() => {
        clearInterval(rollInterval)
        setRolling(false)
        // Display actual results
        const finalRolls: Record<string, number> = {}
        result.rolls.forEach(r => {
          finalRolls[r.characterId] = r.roll
        })
        setDisplayedRolls(finalRolls)

        // Show winner after a brief pause
        setTimeout(() => {
          setShowWinner(true)
        }, 500)
      }, 1500)
    }

    return () => clearInterval(rollInterval)
  }, [isOpen, result, participants])

  // Auto-close after showing winner
  useEffect(() => {
    if (showWinner) {
      const timer = setTimeout(() => {
        onClose()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showWinner, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-zinc-900 to-zinc-950 border-orange-500/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-400">
            <Dice6 className={cn("w-6 h-6", rolling && "animate-spin")} />
            Roll-off: {itemName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Participants and rolls */}
          <div className="space-y-4">
            {participants.map((participant) => {
              const roll = displayedRolls[participant.characterId]
              const isWinner = showWinner && result?.winnerId === participant.characterId

              return (
                <div
                  key={participant.characterId}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-all duration-300",
                    isWinner
                      ? "bg-green-500/20 border-green-500 scale-105"
                      : "bg-zinc-800/50 border-zinc-700"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isWinner && (
                      <Trophy className="w-5 h-5 text-yellow-400 animate-bounce" />
                    )}
                    <span className={cn(
                      "font-medium",
                      isWinner && "text-green-400"
                    )}>
                      {participant.characterName}
                    </span>
                  </div>

                  <div className={cn(
                    "w-16 h-16 flex items-center justify-center rounded-lg text-3xl font-bold transition-all",
                    rolling && "animate-pulse",
                    isWinner ? "bg-green-500/30 text-green-400" : "bg-zinc-700 text-white",
                    roll === 20 && !rolling && "text-yellow-400",
                    roll === 1 && !rolling && "text-red-400"
                  )}>
                    {roll || "?"}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Winner announcement */}
          {showWinner && result && (
            <div className="text-center py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="text-lg font-bold text-yellow-400">
                  {result.winnerName} remporte l'objet!
                </span>
                <Sparkles className="w-5 h-5 text-yellow-400" />
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                Jet gagnant: {result.rolls.find(r => r.characterId === result.winnerId)?.roll}
              </Badge>
            </div>
          )}

          {/* Rolling indicator */}
          {rolling && !showWinner && (
            <div className="text-center text-muted-foreground animate-pulse">
              Lancement des dés...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
