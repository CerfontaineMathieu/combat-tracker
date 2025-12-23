"use client"

import { useState } from "react"
import { Dices, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SAVING_THROW_TYPES, type SavingThrowType } from "@/lib/types"

interface GroupSavePlayerDialogProps {
  open: boolean
  saveType: SavingThrowType
  dc: number
  characterName: string
  onSubmit: (rollResult: number, success: boolean) => void
}

export function GroupSavePlayerDialog({
  open,
  saveType,
  dc,
  characterName,
  onSubmit,
}: GroupSavePlayerDialogProps) {
  const [rollResult, setRollResult] = useState("")

  const saveInfo = SAVING_THROW_TYPES[saveType]
  const resultNum = parseInt(rollResult)
  const isValidResult = !isNaN(resultNum)
  const isSuccess = isValidResult && resultNum >= dc

  const handleSubmit = () => {
    if (!isValidResult) return
    onSubmit(resultNum, isSuccess)
    setRollResult("")
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Dices className="w-5 h-5" />
            Jet de Sauvegarde
          </DialogTitle>
          <DialogDescription>
            {characterName} doit effectuer un jet de sauvegarde
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Save type and DC display */}
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
            <div className="text-lg font-semibold text-amber-400">
              {saveInfo.label} ({saveInfo.abbr})
            </div>
            <div className="text-3xl font-bold mt-1">
              DD {dc}
            </div>
          </div>

          {/* Roll result input */}
          <div className="space-y-2">
            <Label htmlFor="player-roll-result">
              Résultat du jet (d20 + modificateur)
            </Label>
            <Input
              id="player-roll-result"
              type="number"
              placeholder="Entrez votre résultat..."
              value={rollResult}
              onChange={(e) => setRollResult(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isValidResult) {
                  handleSubmit()
                }
              }}
              autoFocus
              className="text-center text-lg h-12"
            />
          </div>

          {/* Live success/failure preview */}
          {isValidResult && (
            <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${
              isSuccess
                ? "bg-emerald/10 border border-emerald/30 text-emerald"
                : "bg-crimson/10 border border-crimson/30 text-crimson"
            }`}>
              {isSuccess ? (
                <>
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Réussite !</span>
                </>
              ) : (
                <>
                  <X className="w-5 h-5" />
                  <span className="font-medium">Échec</span>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!isValidResult}
            className="w-full bg-amber-600 hover:bg-amber-700"
          >
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
