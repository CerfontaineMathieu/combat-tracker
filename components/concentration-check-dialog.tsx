"use client"

import { useState } from "react"
import { Focus, Zap } from "lucide-react"
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

interface ConcentrationCheckDialogProps {
  open: boolean
  participantName: string
  damage: number
  dc: number
  onResult: (passed: boolean) => void
  onCancel: () => void
}

export function ConcentrationCheckDialog({
  open,
  participantName,
  damage,
  dc,
  onResult,
  onCancel,
}: ConcentrationCheckDialogProps) {
  const [rollResult, setRollResult] = useState("")

  const handleSubmit = () => {
    const result = parseInt(rollResult)
    if (!isNaN(result)) {
      onResult(result >= dc)
      setRollResult("")
    }
  }

  const handlePass = () => {
    onResult(true)
    setRollResult("")
  }

  const handleCancel = () => {
    onCancel()
    setRollResult("")
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sky-400">
            <Focus className="w-5 h-5" />
            Test de Concentration
          </DialogTitle>
          <DialogDescription>
            {participantName} doit effectuer un jet de sauvegarde de Constitution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Damage info */}
          <div className="p-3 rounded-lg bg-crimson/10 border border-crimson/30">
            <div className="flex items-center gap-2 text-crimson">
              <Zap className="w-4 h-4" />
              <span className="font-medium">{damage} dégâts subis</span>
            </div>
          </div>

          {/* DC calculation */}
          <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-sky-400">DD {dc}</div>
              <div className="text-xs text-muted-foreground mt-1">
                max(10, {damage}/2) = {Math.floor(damage / 2)} → DD {dc}
              </div>
            </div>
          </div>

          {/* Roll result input */}
          <div className="space-y-2">
            <Label htmlFor="roll-result">Résultat du jet de sauvegarde (CON)</Label>
            <Input
              id="roll-result"
              type="number"
              placeholder="Entrez le résultat..."
              value={rollResult}
              onChange={(e) => setRollResult(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && rollResult && handleSubmit()}
              autoFocus
            />
          </div>

          {/* Quick result based on input */}
          {rollResult && !isNaN(parseInt(rollResult)) && (
            <div className={`text-center text-sm font-medium ${
              parseInt(rollResult) >= dc ? "text-emerald" : "text-crimson"
            }`}>
              {parseInt(rollResult) >= dc
                ? "✓ Concentration maintenue"
                : "✗ Concentration brisée"}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleCancel} className="sm:flex-1">
            Annuler
          </Button>
          <Button
            onClick={rollResult ? handleSubmit : handlePass}
            className="sm:flex-1 bg-emerald hover:bg-emerald/80"
          >
            {rollResult ? "Valider" : "Réussi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
