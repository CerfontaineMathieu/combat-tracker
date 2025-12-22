"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { EquipmentItem, EquipmentSlot, SLOT_NAMES } from "@/lib/types"
import { Search, X, Check } from "lucide-react"

// Rarity colors
const RARITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Commun': { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500' },
  'Peu commun': { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500' },
  'Rare': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500' },
  'Très rare': { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500' },
  'Légendaire': { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500' },
  'Artefact': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500' },
}

interface SlotPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: EquipmentSlot | null
  equipment: EquipmentItem[]
  onSelectItem: (slot: EquipmentSlot, itemId: string | null) => void
}

export function SlotPickerDialog({
  open,
  onOpenChange,
  slot,
  equipment,
  onSelectItem,
}: SlotPickerDialogProps) {
  const [search, setSearch] = useState("")

  if (!slot) return null

  // Get currently equipped item in this slot
  const currentItem = equipment.find(item => item.slot === slot)

  // Get available items (compatible with this slot only)
  const availableItems = equipment.filter(item => {
    // Already in this slot - always show (to allow keeping it)
    if (item.slot === slot) return true
    // Equipped elsewhere - don't show
    if (item.slot && item.slot !== slot) return false
    // Must have slotTypes defined and be compatible with this slot
    if (item.slotTypes && item.slotTypes.length > 0) {
      return item.slotTypes.includes(slot)
    }
    // No slotTypes defined (unknown equipment type like artifacts) - don't show
    return false
  })

  // Filter by search
  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (itemId: string | null) => {
    onSelectItem(slot, itemId)
    onOpenChange(false)
    setSearch("")
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSearch("") }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Équiper: {SLOT_NAMES[slot]}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un équipement..."
              className="pl-9"
            />
          </div>

          {/* Current item - option to unequip */}
          {currentItem && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 border-destructive/50 hover:bg-destructive/10"
              onClick={() => handleSelect(null)}
            >
              <X className="w-4 h-4 text-destructive" />
              <span>Retirer: {currentItem.name}</span>
            </Button>
          )}

          {/* Item list */}
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {filteredItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun équipement disponible
                </p>
              ) : (
                filteredItems.map(item => {
                  const isCurrentlyEquipped = item.slot === slot
                  const rarityStyle = item.rarity ? RARITY_COLORS[item.rarity] : null

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg border transition-all",
                        "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring",
                        isCurrentlyEquipped
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{item.name}</span>
                            {isCurrentlyEquipped && (
                              <Check className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                        {item.rarity && rarityStyle && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-xs",
                              rarityStyle.bg,
                              rarityStyle.text,
                              rarityStyle.border
                            )}
                          >
                            {item.rarity}
                          </Badge>
                        )}
                      </div>
                      {item.requiresAttunement && (
                        <p className="text-xs text-amber-500 mt-1">
                          Nécessite harmonisation
                        </p>
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
