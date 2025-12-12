"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Trophy, Coins, Package, CheckCircle } from "lucide-react"
import type { LootDistribution } from "@/lib/types"
import { LOOT_RARITIES } from "@/lib/types"
import { cn } from "@/lib/utils"

interface LootDistributionSummaryDialogProps {
  isOpen: boolean
  onClose: () => void
  distributions: LootDistribution[]
  currentCharacterId?: string
}

export function LootDistributionSummaryDialog({
  isOpen,
  onClose,
  distributions,
  currentCharacterId,
}: LootDistributionSummaryDialogProps) {
  // Find current player's distribution (if player mode)
  const myDistribution = currentCharacterId
    ? distributions.find((d) => d.characterId === currentCharacterId)
    : null

  // For DM, show all distributions
  const showAll = !currentCharacterId

  const renderDistribution = (dist: LootDistribution, highlight: boolean = false) => {
    const hasCurrency = (
      dist.currency.platinum > 0 ||
      dist.currency.gold > 0 ||
      dist.currency.electrum > 0 ||
      dist.currency.silver > 0 ||
      dist.currency.copper > 0
    )
    const hasItems = dist.items.length > 0

    return (
      <div
        key={dist.characterId}
        className={cn(
          "p-4 rounded-lg border",
          highlight ? "border-gold bg-gold/5" : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className={cn("w-5 h-5", highlight ? "text-gold" : "text-green-500")} />
          <span className="font-semibold text-lg">{dist.characterName}</span>
        </div>

        {/* Currency */}
        {hasCurrency && (
          <div className="flex items-center gap-3 mb-3">
            <Coins className="w-4 h-4 text-amber-400" />
            <div className="flex gap-2 flex-wrap text-sm">
              {dist.currency.platinum > 0 && (
                <span className="text-cyan-300 font-medium">{dist.currency.platinum} pp</span>
              )}
              {dist.currency.gold > 0 && (
                <span className="text-amber-400 font-medium">{dist.currency.gold} po</span>
              )}
              {dist.currency.electrum > 0 && (
                <span className="text-blue-300 font-medium">{dist.currency.electrum} pe</span>
              )}
              {dist.currency.silver > 0 && (
                <span className="text-slate-300">{dist.currency.silver} pa</span>
              )}
              {dist.currency.copper > 0 && (
                <span className="text-orange-400">{dist.currency.copper} pc</span>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        {hasItems && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>Objets reçus ({dist.items.length})</span>
            </div>
            <div className="space-y-1 pl-6">
              {dist.items.map((item, idx) => {
                const rarityStyle = LOOT_RARITIES[item.rarity] || LOOT_RARITIES.common
                return (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className={cn("font-medium", rarityStyle.color)}>{item.name}</span>
                    {item.quantity > 1 && (
                      <Badge variant="outline" className="text-xs">x{item.quantity}</Badge>
                    )}
                    <Badge variant="secondary" className={cn("text-xs", rarityStyle.bgColor, rarityStyle.color)}>
                      {rarityStyle.label}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {!hasCurrency && !hasItems && (
          <p className="text-sm text-muted-foreground">Aucun butin reçu</p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-amber-500/30">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center text-amber-400 flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" />
            Butin distribué !
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-4">
            {/* Player view - show only their distribution */}
            {myDistribution && !showAll && (
              <>
                <p className="text-center text-muted-foreground text-sm mb-4">
                  Voici ce que vous avez reçu :
                </p>
                {renderDistribution(myDistribution, true)}
              </>
            )}

            {/* DM view - show all distributions */}
            {showAll && (
              <>
                <p className="text-center text-muted-foreground text-sm mb-4">
                  Résumé de la distribution ({distributions.length} personnage{distributions.length > 1 ? 's' : ''})
                </p>
                <div className="space-y-3">
                  {distributions.map((dist) => renderDistribution(dist))}
                </div>
              </>
            )}

            {/* Player with no distribution */}
            {!myDistribution && !showAll && (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">Vous n'avez pas reçu de butin cette fois-ci.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <Separator />

        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
