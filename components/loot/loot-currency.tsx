"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Coins } from "lucide-react"
import type { LootCurrency, CurrencySplitMethod } from "@/lib/types"
import { formatCurrency, splitCurrencyEqually } from "@/lib/loot-utils"
import { cn } from "@/lib/utils"

interface LootCurrencyProps {
  currency: LootCurrency
  splitMethod: CurrencySplitMethod
  isDM: boolean
  characterIds?: string[]
  characterNames?: Record<string, string>
  onCurrencyChange?: (currency: LootCurrency, splitMethod: CurrencySplitMethod) => void
}

export function LootCurrencyDisplay({
  currency,
  splitMethod,
  isDM,
  characterIds = [],
  characterNames = {},
  onCurrencyChange,
}: LootCurrencyProps) {
  const [localCurrency, setLocalCurrency] = useState(currency)
  const [localSplitMethod, setLocalSplitMethod] = useState(splitMethod)

  // Calculate split preview
  const splitPreview = splitMethod === 'equal' && characterIds.length > 0
    ? splitCurrencyEqually(currency, characterIds)
    : new Map<string, LootCurrency>()

  const handleCurrencyInput = (field: keyof LootCurrency, value: string) => {
    const numValue = parseInt(value, 10) || 0
    const newCurrency = { ...localCurrency, [field]: Math.max(0, numValue) }
    setLocalCurrency(newCurrency)
    onCurrencyChange?.(newCurrency, localSplitMethod)
  }

  const handleSplitMethodChange = (method: CurrencySplitMethod) => {
    setLocalSplitMethod(method)
    onCurrencyChange?.(localCurrency, method)
  }

  // Calculate total value in gold pieces (1pp=10gp, 1ep=0.5gp, 1sp=0.1gp, 1cp=0.01gp)
  const totalValue = (
    currency.platinum * 10 +
    currency.gold +
    currency.electrum * 0.5 +
    currency.silver * 0.1 +
    currency.copper * 0.01
  )

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-amber-400">
          <Coins className="w-5 h-5" />
          Monnaie
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Currency display/input */}
        <div className="flex items-center gap-3 flex-wrap">
          {isDM ? (
            // DM can edit currency
            <>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={localCurrency.platinum}
                  onChange={(e) => handleCurrencyInput('platinum', e.target.value)}
                  className="w-16 text-right text-sm"
                />
                <span className="text-cyan-300 font-medium text-sm">pp</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={localCurrency.gold}
                  onChange={(e) => handleCurrencyInput('gold', e.target.value)}
                  className="w-16 text-right text-sm"
                />
                <span className="text-amber-400 font-medium text-sm">po</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={localCurrency.electrum}
                  onChange={(e) => handleCurrencyInput('electrum', e.target.value)}
                  className="w-16 text-right text-sm"
                />
                <span className="text-blue-300 font-medium text-sm">pe</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={localCurrency.silver}
                  onChange={(e) => handleCurrencyInput('silver', e.target.value)}
                  className="w-16 text-right text-sm"
                />
                <span className="text-gray-400 font-medium text-sm">pa</span>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  value={localCurrency.copper}
                  onChange={(e) => handleCurrencyInput('copper', e.target.value)}
                  className="w-16 text-right text-sm"
                />
                <span className="text-orange-700 font-medium text-sm">pc</span>
              </div>
            </>
          ) : (
            // Player sees read-only
            <div className="flex items-center gap-2 flex-wrap">
              {currency.platinum > 0 && (
                <Badge variant="outline" className="text-cyan-300 border-cyan-300/50">
                  {currency.platinum} pp
                </Badge>
              )}
              {currency.gold > 0 && (
                <Badge variant="outline" className="text-amber-400 border-amber-400/50">
                  {currency.gold} po
                </Badge>
              )}
              {currency.electrum > 0 && (
                <Badge variant="outline" className="text-blue-300 border-blue-300/50">
                  {currency.electrum} pe
                </Badge>
              )}
              {currency.silver > 0 && (
                <Badge variant="outline" className="text-gray-400 border-gray-400/50">
                  {currency.silver} pa
                </Badge>
              )}
              {currency.copper > 0 && (
                <Badge variant="outline" className="text-orange-700 border-orange-700/50">
                  {currency.copper} pc
                </Badge>
              )}
            </div>
          )}

          {totalValue > 0 && (
            <span className="text-sm text-muted-foreground ml-auto">
              Total: ~{totalValue.toFixed(2)} po
            </span>
          )}
        </div>

        {/* Split method (DM only) */}
        {isDM && characterIds.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Méthode de partage</Label>
            <RadioGroup
              value={localSplitMethod}
              onValueChange={(v) => handleSplitMethodChange(v as CurrencySplitMethod)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="equal" id="split-equal" />
                <Label htmlFor="split-equal" className="cursor-pointer">
                  Équitable
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manual" id="split-manual" />
                <Label htmlFor="split-manual" className="cursor-pointer">
                  Manuel
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* Split preview */}
        {splitMethod === 'equal' && characterIds.length > 0 && totalValue > 0 && (
          <div className="p-2 rounded bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Aperçu du partage ({characterIds.length} personnages):
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {characterIds.map((charId) => {
                const share = splitPreview.get(charId)
                return (
                  <div key={charId} className="flex items-center justify-between">
                    <span className="truncate">{characterNames[charId] || charId}</span>
                    <span className="text-amber-400 font-medium">
                      {share ? formatCurrency(share) : '0 po'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
