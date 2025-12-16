"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Minus, Plus, Split } from "lucide-react"
import type { LootItem } from "@/lib/types"
import { LOOT_RARITIES } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SplitItemDialogProps {
  isOpen: boolean
  onClose: () => void
  item: LootItem | null
  targetCharacter: { id: string; name: string } | null
  onConfirm: (itemId: string, characterId: string, characterName: string, quantity: number) => void
}

export function SplitItemDialog({
  isOpen,
  onClose,
  item,
  targetCharacter,
  onConfirm,
}: SplitItemDialogProps) {
  const [quantity, setQuantity] = useState(1)

  // Reset quantity when dialog opens with new item
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    } else if (item) {
      setQuantity(item.quantity)
    }
  }

  const handleConfirm = () => {
    if (!item || !targetCharacter || quantity < 1) return
    onConfirm(item.id, targetCharacter.id, targetCharacter.name, quantity)
    onClose()
  }

  if (!item || !targetCharacter) return null

  const rarityStyle = LOOT_RARITIES[item.rarity] || LOOT_RARITIES.common
  const maxQty = item.quantity
  const isPartialSplit = quantity < maxQty

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Split className="w-5 h-5" />
            Attribuer à {targetCharacter.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="flex-1">
              <p className={cn("font-medium", rarityStyle.color)}>{item.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className={cn("text-xs", rarityStyle.bgColor, rarityStyle.color)}>
                  {rarityStyle.label}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Quantité disponible: {maxQty}
                </span>
              </div>
            </div>
          </div>

          {/* Quantity selector */}
          <div className="space-y-2">
            <Label>Quantité à attribuer</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="w-4 h-4" />
              </Button>

              <Input
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  if (!isNaN(val)) {
                    setQuantity(Math.max(1, Math.min(maxQty, val)))
                  }
                }}
                className="w-20 text-center"
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                disabled={quantity >= maxQty}
              >
                <Plus className="w-4 h-4" />
              </Button>

              <span className="text-sm text-muted-foreground">/ {maxQty}</span>
            </div>
          </div>

          {/* Split preview */}
          {isPartialSplit && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-sm text-amber-400">
                <Split className="w-4 h-4 inline mr-1" />
                {quantity} iront à <span className="font-medium">{targetCharacter.name}</span>,
                {" "}{maxQty - quantity} resteront dans le butin
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleConfirm}>
            Attribuer {quantity} {quantity > 1 ? "objets" : "objet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
