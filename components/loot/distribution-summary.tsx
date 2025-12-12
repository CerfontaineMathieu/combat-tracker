"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trophy, Coins, Package, Building2 } from "lucide-react"
import { CharacterLootCard } from "./character-loot-card"
import { TreasurySection } from "./treasury-section"
import type { LootSession, LootDistribution, LootCurrency } from "@/lib/types"
import { splitCurrencyEqually, formatCurrency } from "@/lib/loot-utils"

interface DistributionSummaryProps {
  session: LootSession
  characterIds: string[]
  characterNames: Record<string, string>
  distributions?: LootDistribution[]
  isPreview?: boolean
}

export function DistributionSummary({
  session,
  characterIds,
  characterNames,
  distributions,
  isPreview = false,
}: DistributionSummaryProps) {
  // Calculate distribution preview from session state
  const calculatedDistributions = useMemo(() => {
    if (distributions && distributions.length > 0) {
      return distributions
    }

    // Calculate from current session state
    const currencySplit = session.currencySplitMethod === 'equal'
      ? splitCurrencyEqually(session.currency, characterIds)
      : new Map<string, LootCurrency>()

    const result: LootDistribution[] = characterIds.map((characterId) => ({
      id: `preview-${characterId}`,
      sessionId: session.id,
      characterId,
      characterName: characterNames[characterId] || 'Inconnu',
      currency: currencySplit.get(characterId) || { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
      items: session.items
        .filter((item) => item.assignedTo === characterId && item.status === 'assigned')
        .map((item) => ({
          itemId: item.id,
          name: item.name,
          quantity: item.quantity,
          rarity: item.rarity,
        })),
    }))

    return result
  }, [session, characterIds, characterNames, distributions])

  // Treasury items (unclaimed or explicitly sent to treasury)
  const treasuryItems = useMemo(() => {
    return session.items.filter((item) => item.status === 'treasury')
  }, [session.items])

  // Total currency being distributed
  const totalCurrency = session.currency

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <Trophy className="w-5 h-5" />
          {isPreview ? "Apercu de la distribution" : "Resumé de la distribution"}
        </CardTitle>
        {isPreview && (
          <p className="text-xs text-muted-foreground">
            Voici comment le butin sera réparti une fois finalisé.
          </p>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="p-0">
        <ScrollArea className="max-h-[500px]">
          <div className="p-4 space-y-4">
            {/* Total currency summary */}
            <div className="flex items-center gap-2 text-sm">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-muted-foreground">Total:</span>
              <Badge variant="outline" className="text-yellow-400">
                {formatCurrency(totalCurrency)}
              </Badge>
              <span className="text-muted-foreground">
                ({session.currencySplitMethod === 'equal' ? 'réparti équitablement' : 'répartition manuelle'})
              </span>
            </div>

            <Separator />

            {/* Per-character breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Package className="w-4 h-4" />
                Par personnage ({calculatedDistributions.length})
              </h3>

              {calculatedDistributions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun personnage connecté pour la distribution.
                </p>
              ) : (
                <div className="grid gap-3">
                  {calculatedDistributions.map((distribution) => (
                    <CharacterLootCard
                      key={distribution.characterId}
                      distribution={distribution}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Treasury section */}
            {treasuryItems.length > 0 && (
              <>
                <Separator />
                <TreasurySection items={treasuryItems} />
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
