"use client"

import { useState } from "react"
import { Dices, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SAVING_THROW_TYPES, type SavingThrowType } from "@/lib/types"

interface PendingCharacter {
  participantId: string
  participantName: string
}

interface GroupSavePlayerDialogProps {
  open: boolean
  saveType: SavingThrowType
  dc: number
  myCharacters: PendingCharacter[]
  onSubmit: (participantId: string, rollResult: number, success: boolean) => void
}

export function GroupSavePlayerDialog({
  open,
  saveType,
  dc,
  myCharacters,
  onSubmit,
}: GroupSavePlayerDialogProps) {
  // Track roll inputs and submitted characters locally
  const [rollInputs, setRollInputs] = useState<Record<string, string>>({})
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set())

  const saveInfo = SAVING_THROW_TYPES[saveType]

  const handleSubmit = (character: PendingCharacter) => {
    const rollValue = rollInputs[character.participantId] || ""
    const resultNum = parseInt(rollValue)
    if (isNaN(resultNum)) return

    const isSuccess = resultNum >= dc
    onSubmit(character.participantId, resultNum, isSuccess)
    setSubmittedIds(prev => new Set([...prev, character.participantId]))
  }

  const getRollResult = (participantId: string) => {
    const value = rollInputs[participantId] || ""
    const num = parseInt(value)
    return { value, num, isValid: !isNaN(num), isSuccess: !isNaN(num) && num >= dc }
  }

  // Characters still needing to submit
  const pendingCharacters = myCharacters.filter(c => !submittedIds.has(c.participantId))
  const completedCharacters = myCharacters.filter(c => submittedIds.has(c.participantId))

  const isPlural = myCharacters.length > 1

  return (
    <Dialog open={open && pendingCharacters.length > 0}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Dices className="w-5 h-5" />
            {isPlural ? "Jets de Sauvegarde" : "Jet de Sauvegarde"}
          </DialogTitle>
          <DialogDescription>
            {isPlural
              ? `Vos personnages doivent effectuer un jet de ${saveInfo.label}`
              : `${pendingCharacters[0]?.participantName} doit effectuer un jet de ${saveInfo.label}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Save type badge - NO DC shown */}
          <div className="flex justify-center">
            <Badge variant="outline" className="text-lg px-4 py-2 border-amber-500/50 text-amber-400">
              {saveInfo.label} ({saveInfo.abbr})
            </Badge>
          </div>

          {/* Completed characters */}
          {completedCharacters.length > 0 && (
            <div className="space-y-2">
              {completedCharacters.map(character => (
                <div
                  key={character.participantId}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 opacity-60"
                >
                  <span className="font-medium">{character.participantName}</span>
                  <Badge variant="outline" className="bg-emerald/10 text-emerald border-emerald/30">
                    <Check className="w-3 h-3 mr-1" />
                    Soumis
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Pending characters - each with their own input */}
          <div className="space-y-3">
            {pendingCharacters.map((character, index) => {
              const { value, isValid } = getRollResult(character.participantId)
              return (
                <div
                  key={character.participantId}
                  className="p-3 rounded-lg bg-secondary/50 border border-border space-y-2"
                >
                  <div className="font-medium text-foreground">{character.participantName}</div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="d20 + mod"
                      value={value}
                      onChange={(e) => setRollInputs(prev => ({
                        ...prev,
                        [character.participantId]: e.target.value
                      }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && isValid) {
                          handleSubmit(character)
                        }
                      }}
                      autoFocus={index === 0}
                      className="text-center h-10 flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSubmit(character)}
                      disabled={!isValid}
                      className="bg-amber-600 hover:bg-amber-700 h-10 px-4"
                    >
                      OK
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
