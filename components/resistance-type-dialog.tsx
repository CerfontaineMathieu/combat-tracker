"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Check, FlaskConical, Flame, Snowflake, Zap, Wind, Skull, Brain, Sun, Cloud } from "lucide-react"
import type { CatalogItem, ResistanceType } from "@/lib/types"
import { RESISTANCE_TYPES } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ResistanceTypeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalogItem: CatalogItem | null
  onConfirm: (item: CatalogItem, resistanceType: ResistanceType) => void
  onCancel: () => void
}

// Visual configuration for each resistance type
const RESISTANCE_CONFIG: Record<ResistanceType, {
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
}> = {
  'Acide': {
    icon: <FlaskConical className="w-5 h-5" />,
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/20',
    borderColor: 'border-lime-500/50',
  },
  'Froid': {
    icon: <Snowflake className="w-5 h-5" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/50',
  },
  'Feu': {
    icon: <Flame className="w-5 h-5" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/50',
  },
  'Force': {
    icon: <Wind className="w-5 h-5" />,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500/50',
  },
  'Foudre': {
    icon: <Zap className="w-5 h-5" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
  },
  'Nécrotique': {
    icon: <Skull className="w-5 h-5" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
  },
  'Poison': {
    icon: <FlaskConical className="w-5 h-5" />,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/50',
  },
  'Psychique': {
    icon: <Brain className="w-5 h-5" />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/50',
  },
  'Radiant': {
    icon: <Sun className="w-5 h-5" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
  },
  'Tonnerre': {
    icon: <Cloud className="w-5 h-5" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
  },
}

export function ResistanceTypeDialog({
  open,
  onOpenChange,
  catalogItem,
  onConfirm,
  onCancel,
}: ResistanceTypeDialogProps) {
  const [selectedType, setSelectedType] = useState<ResistanceType | null>(null)

  // Reset selection when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedType(null)
    }
  }, [open])

  const handleConfirm = () => {
    if (selectedType && catalogItem) {
      onConfirm(catalogItem, selectedType)
    }
  }

  const handleCancel = () => {
    onCancel()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-400">
            <FlaskConical className="w-5 h-5" />
            Type de résistance
          </DialogTitle>
          <DialogDescription>
            {catalogItem && (
              <span className="text-foreground font-medium">{catalogItem.name}</span>
            )}
            {" "}- Sélectionnez le type de dégâts
          </DialogDescription>
        </DialogHeader>

        {/* Resistance type grid */}
        <div className="grid grid-cols-2 gap-2">
          {RESISTANCE_TYPES.map((type) => {
            const config = RESISTANCE_CONFIG[type]
            const isSelected = selectedType === type

            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all",
                  isSelected
                    ? `${config.bgColor} ${config.borderColor} ring-2 ring-offset-2 ring-offset-background`
                    : "border-border hover:border-muted-foreground bg-card"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  config.bgColor
                )}>
                  <span className={config.color}>{config.icon}</span>
                </div>
                <span className={cn(
                  "font-medium text-sm",
                  isSelected ? config.color : "text-foreground"
                )}>
                  {type}
                </span>
                {isSelected && (
                  <Check className={cn("w-4 h-4 ml-auto", config.color)} />
                )}
              </button>
            )
          })}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
          >
            Annuler
          </Button>
          <Button
            type="button"
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            disabled={!selectedType}
            onClick={handleConfirm}
          >
            <FlaskConical className="w-4 h-4 mr-2" />
            Ajouter la potion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
