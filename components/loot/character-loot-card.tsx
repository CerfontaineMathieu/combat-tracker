"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Coins, Package } from "lucide-react"
import type { LootDistribution, LootItemRarity } from "@/lib/types"
import { formatCurrency, isCurrencyEmpty } from "@/lib/loot-utils"
import { cn } from "@/lib/utils"

interface CharacterLootCardProps {
  distribution: LootDistribution
}

const RARITY_COLORS: Record<LootItemRarity, string> = {
  common: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  uncommon: "text-green-400 bg-green-500/10 border-green-500/30",
  rare: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  very_rare: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  legendary: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  artifact: "text-red-400 bg-red-500/10 border-red-500/30",
}

export function CharacterLootCard({ distribution }: CharacterLootCardProps) {
  const hasCurrency = !isCurrencyEmpty(distribution.currency)
  const hasItems = distribution.items.length > 0
  const isEmpty = !hasCurrency && !hasItems

  return (
    <Card className="border-zinc-700/50 bg-zinc-800/30">
      <CardContent className="p-3">
        {/* Character name */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
            <User className="w-4 h-4 text-amber-400" />
          </div>
          <span className="font-medium text-sm">{distribution.characterName}</span>
        </div>

        {isEmpty ? (
          <p className="text-xs text-muted-foreground italic pl-10">
            Aucun butin attribué
          </p>
        ) : (
          <div className="pl-10 space-y-2">
            {/* Currency */}
            {hasCurrency && (
              <div className="flex items-center gap-2 text-sm">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-400 font-medium">
                  {formatCurrency(distribution.currency)}
                </span>
              </div>
            )}

            {/* Items */}
            {hasItems && (
              <div className="space-y-1">
                {distribution.items.map((item) => (
                  <div
                    key={item.itemId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{item.name}</span>
                    {item.quantity > 1 && (
                      <span className="text-muted-foreground">x{item.quantity}</span>
                    )}
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0", RARITY_COLORS[item.rarity])}
                    >
                      {item.rarity === 'very_rare' ? 'Très rare' :
                       item.rarity === 'common' ? 'Commun' :
                       item.rarity === 'uncommon' ? 'Peu commun' :
                       item.rarity === 'rare' ? 'Rare' :
                       item.rarity === 'legendary' ? 'Légendaire' :
                       'Artéfact'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
