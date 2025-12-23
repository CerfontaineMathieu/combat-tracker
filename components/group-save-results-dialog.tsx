"use client"

import { useState } from "react"
import { Dices, Check, X, Loader2, Skull, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SAVING_THROW_TYPES, type SavingThrowType } from "@/lib/types"
import type { GroupSaveParticipantResult } from "@/lib/socket-events"

interface GroupSaveResultsDialogProps {
  open: boolean
  saveType: SavingThrowType
  dc: number
  results: GroupSaveParticipantResult[]
  isComplete: boolean
  onSubmitResult: (participantId: string, rollResult: number, success: boolean) => void
  onClose: () => void
}

export function GroupSaveResultsDialog({
  open,
  saveType,
  dc,
  results,
  isComplete,
  onSubmitResult,
  onClose,
}: GroupSaveResultsDialogProps) {
  const [monsterInputs, setMonsterInputs] = useState<Record<string, string>>({})

  const saveInfo = SAVING_THROW_TYPES[saveType]

  const players = results.filter(r => r.participantType === 'player')
  const monsters = results.filter(r => r.participantType === 'monster')

  const successCount = results.filter(r => r.success === true).length
  const failureCount = results.filter(r => r.success === false).length
  const pendingCount = results.filter(r => r.rollResult === null).length

  const handleMonsterSubmit = (participantId: string) => {
    const inputValue = monsterInputs[participantId]
    if (!inputValue) return

    const rollResult = parseInt(inputValue)
    if (isNaN(rollResult)) return

    onSubmitResult(participantId, rollResult, rollResult >= dc)
    setMonsterInputs(prev => ({ ...prev, [participantId]: "" }))
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Dices className="w-5 h-5" />
            JdS {saveInfo.abbr} DD {dc}
          </DialogTitle>
        </DialogHeader>

        {/* Summary badges */}
        <div className="flex gap-2 justify-center">
          <Badge variant="outline" className="text-emerald border-emerald/30 bg-emerald/10">
            <Check className="w-3 h-3 mr-1" />
            {successCount} réussi{successCount > 1 ? "s" : ""}
          </Badge>
          <Badge variant="outline" className="text-crimson border-crimson/30 bg-crimson/10">
            <X className="w-3 h-3 mr-1" />
            {failureCount} échoué{failureCount > 1 ? "s" : ""}
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-muted-foreground">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {pendingCount} en attente
            </Badge>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          <div className="space-y-4 pr-4">
            {/* Players section */}
            {players.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 font-medium">
                  <Users className="w-4 h-4" />
                  Joueurs
                </div>
                <div className="space-y-2">
                  {players.map((result) => (
                    <div
                      key={result.participantId}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md border",
                        result.rollResult === null && "bg-muted/30 border-muted",
                        result.success === true && "bg-emerald/10 border-emerald/30",
                        result.success === false && "bg-crimson/10 border-crimson/30"
                      )}
                    >
                      <span className="font-medium">{result.participantName}</span>
                      {result.rollResult === null ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">En attente...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {result.rollResult}
                          </Badge>
                          {result.success ? (
                            <Check className="w-5 h-5 text-emerald" />
                          ) : (
                            <X className="w-5 h-5 text-crimson" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monsters section */}
            {monsters.length > 0 && (
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 font-medium">
                  <Skull className="w-4 h-4" />
                  Monstres
                </div>
                <div className="space-y-2">
                  {monsters.map((result) => (
                    <div
                      key={result.participantId}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md border",
                        result.rollResult === null && "bg-muted/30 border-muted",
                        result.success === true && "bg-emerald/10 border-emerald/30",
                        result.success === false && "bg-crimson/10 border-crimson/30"
                      )}
                    >
                      <span className="font-medium">{result.participantName}</span>
                      {result.rollResult === null ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Jet"
                            value={monsterInputs[result.participantId] || ""}
                            onChange={(e) => setMonsterInputs(prev => ({
                              ...prev,
                              [result.participantId]: e.target.value
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleMonsterSubmit(result.participantId)
                              }
                            }}
                            className="w-20 h-8"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMonsterSubmit(result.participantId)}
                            disabled={!monsterInputs[result.participantId]}
                          >
                            OK
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {result.rollResult}
                          </Badge>
                          {result.success ? (
                            <Check className="w-5 h-5 text-emerald" />
                          ) : (
                            <X className="w-5 h-5 text-crimson" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
