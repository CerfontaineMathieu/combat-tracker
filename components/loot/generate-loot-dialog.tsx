"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dices, Coins, Loader2 } from "lucide-react"

type CRTier = '0-4' | '5-10' | '11-16' | '17+'
type TreasureType = 'hoard' | 'individual'

interface GenerateLootDialogProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (data: {
    crTier: CRTier
    type: TreasureType
    monsterCount?: number
  }) => void
}

const CR_TIERS: { value: CRTier; label: string; description: string }[] = [
  { value: '0-4', label: 'CR 0-4', description: 'Niveaux 1-4' },
  { value: '5-10', label: 'CR 5-10', description: 'Niveaux 5-10' },
  { value: '11-16', label: 'CR 11-16', description: 'Niveaux 11-16' },
  { value: '17+', label: 'CR 17+', description: 'Niveaux 17+' },
]

export function GenerateLootDialog({ isOpen, onClose, onGenerate }: GenerateLootDialogProps) {
  const [crTier, setCrTier] = useState<CRTier>('0-4')
  const [treasureType, setTreasureType] = useState<TreasureType>('hoard')
  const [monsterCount, setMonsterCount] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    onGenerate({
      crTier,
      type: treasureType,
      monsterCount: treasureType === 'individual' ? monsterCount : undefined,
    })
    // Reset and close after a short delay for UX feedback
    setTimeout(() => {
      setIsGenerating(false)
      onClose()
    }, 500)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dices className="h-5 w-5" />
            Générer un trésor (DMG)
          </DialogTitle>
          <DialogDescription>
            Utilisez les tables officielles du DMG pour générer du butin aléatoire.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* CR Tier Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Difficulté (CR)</Label>
            <RadioGroup
              value={crTier}
              onValueChange={(value) => setCrTier(value as CRTier)}
              className="grid grid-cols-2 gap-2"
            >
              {CR_TIERS.map((tier) => (
                <div key={tier.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={tier.value} id={`cr-${tier.value}`} />
                  <Label
                    htmlFor={`cr-${tier.value}`}
                    className="flex flex-col cursor-pointer"
                  >
                    <span className="font-medium">{tier.label}</span>
                    <span className="text-xs text-muted-foreground">{tier.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Treasure Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Type de trésor</Label>
            <RadioGroup
              value={treasureType}
              onValueChange={(value) => setTreasureType(value as TreasureType)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hoard" id="type-hoard" />
                <Label htmlFor="type-hoard" className="flex flex-col cursor-pointer">
                  <span className="font-medium flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Trésor de groupe (Hoard)
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Butin complet avec monnaie et objets magiques
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="type-individual" />
                <Label htmlFor="type-individual" className="flex flex-col cursor-pointer">
                  <span className="font-medium">Trésor individuel</span>
                  <span className="text-xs text-muted-foreground">
                    Petite monnaie par monstre (pas d&apos;objets magiques)
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Monster Count (for individual treasure) */}
          {treasureType === 'individual' && (
            <div className="space-y-2">
              <Label htmlFor="monster-count">Nombre de monstres</Label>
              <Input
                id="monster-count"
                type="number"
                min={1}
                max={100}
                value={monsterCount}
                onChange={(e) => setMonsterCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <Dices className="h-4 w-4 mr-2" />
                Générer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
