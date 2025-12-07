"use client"

import { useState } from "react"
import { Dog, X, Check, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { CombatParticipant } from "@/lib/types"

interface OrphanPetDialogProps {
  owner: CombatParticipant
  pets: CombatParticipant[]
  open: boolean
  onConfirm: (petsToKeep: string[], petsToRemove: string[]) => void
  onCancel: () => void
}

export function OrphanPetDialog({
  owner,
  pets,
  open,
  onConfirm,
  onCancel,
}: OrphanPetDialogProps) {
  // Track which pets to keep (true) or remove (false)
  const [petDecisions, setPetDecisions] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(pets.map(p => [p.id, true])) // Default: keep all
  )

  const handleTogglePet = (petId: string) => {
    setPetDecisions(prev => ({
      ...prev,
      [petId]: !prev[petId]
    }))
  }

  const handleKeepAll = () => {
    setPetDecisions(Object.fromEntries(pets.map(p => [p.id, true])))
  }

  const handleRemoveAll = () => {
    setPetDecisions(Object.fromEntries(pets.map(p => [p.id, false])))
  }

  const handleConfirm = () => {
    const petsToKeep = pets.filter(p => petDecisions[p.id]).map(p => p.id)
    const petsToRemove = pets.filter(p => !petDecisions[p.id]).map(p => p.id)
    onConfirm(petsToKeep, petsToRemove)
  }

  const keptCount = Object.values(petDecisions).filter(Boolean).length
  const removedCount = pets.length - keptCount

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gold" />
            Familiers orphelins
          </DialogTitle>
          <DialogDescription>
            {owner.name} a {pets.length} familier{pets.length > 1 ? "s" : ""}. Que voulez-vous faire ?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Bulk actions */}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleKeepAll}
              className="text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Garder tous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemoveAll}
              className="text-xs text-crimson hover:text-crimson"
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Retirer tous
            </Button>
          </div>

          {/* Pet list */}
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {pets.map((pet) => (
                <div
                  key={pet.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-colors",
                    petDecisions[pet.id]
                      ? "bg-emerald/10 border-emerald/30"
                      : "bg-crimson/10 border-crimson/30"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Dog className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium text-sm truncate block">{pet.name}</span>
                      <span className="text-xs text-muted-foreground">
                        PV: {pet.currentHp}/{pet.maxHp}
                        {pet.ac && ` • CA: ${pet.ac}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant={petDecisions[pet.id] ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 px-2 text-xs",
                        petDecisions[pet.id] && "bg-emerald hover:bg-emerald/80"
                      )}
                      onClick={() => petDecisions[pet.id] || handleTogglePet(pet.id)}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant={!petDecisions[pet.id] ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 px-2 text-xs",
                        !petDecisions[pet.id] && "bg-crimson hover:bg-crimson/80"
                      )}
                      onClick={() => !petDecisions[pet.id] || handleTogglePet(pet.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Summary */}
          <div className="text-xs text-muted-foreground text-center">
            {keptCount > 0 && (
              <span className="text-emerald">{keptCount} gardé{keptCount > 1 ? "s" : ""}</span>
            )}
            {keptCount > 0 && removedCount > 0 && " • "}
            {removedCount > 0 && (
              <span className="text-crimson">{removedCount} retiré{removedCount > 1 ? "s" : ""}</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={handleConfirm}>
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
