"use client"

import { Badge } from "@/components/ui/badge"
import { Building2, Package } from "lucide-react"
import type { LootItem, LootItemRarity } from "@/lib/types"
import { cn } from "@/lib/utils"

interface TreasurySectionProps {
  items: LootItem[]
}

const RARITY_COLORS: Record<LootItemRarity, string> = {
  common: "text-gray-400 bg-gray-500/10 border-gray-500/30",
  uncommon: "text-green-400 bg-green-500/10 border-green-500/30",
  rare: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  very_rare: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  legendary: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  artifact: "text-red-400 bg-red-500/10 border-red-500/30",
}

const RARITY_LABELS: Record<LootItemRarity, string> = {
  common: "Commun",
  uncommon: "Peu commun",
  rare: "Rare",
  very_rare: "Très rare",
  legendary: "Légendaire",
  artifact: "Artéfact",
}

export function TreasurySection({ items }: TreasurySectionProps) {
  if (items.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        Trésor du groupe ({items.length})
      </h3>
      <p className="text-xs text-muted-foreground">
        Ces objets n'ont pas été réclamés et iront dans le trésor commun.
      </p>

      <div className="space-y-1.5 mt-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-2 rounded-md bg-zinc-800/30 border border-zinc-700/50"
          >
            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm flex-1">{item.name}</span>
            {item.quantity > 1 && (
              <span className="text-sm text-muted-foreground">x{item.quantity}</span>
            )}
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0 shrink-0", RARITY_COLORS[item.rarity])}
            >
              {RARITY_LABELS[item.rarity]}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
