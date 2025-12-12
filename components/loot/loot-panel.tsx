"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Trophy,
  Plus,
  Timer,
  CheckCircle,
  XCircle,
  Loader2,
  Package,
} from "lucide-react"
import { LootItemCard } from "./loot-item-card"
import { LootCurrencyDisplay } from "./loot-currency"
import { SplitItemDialog } from "./split-item-dialog"
import type { LootSession, LootItem } from "@/lib/types"
import type { ConnectedPlayer } from "@/lib/socket-events"
import {
  sortItemsByStatus,
  getTimeRemaining,
  formatTimeRemaining,
  areAllItemsResolved,
  getContestedItems,
} from "@/lib/loot-utils"
import { cn } from "@/lib/utils"

interface LootPanelProps {
  session: LootSession | null
  isDM: boolean
  currentCharacterId?: string
  currentCharacterName?: string
  connectedPlayers?: ConnectedPlayer[]
  isLoading?: boolean
  // Actions
  onCreateSession?: () => void
  onAddItem?: () => void
  onClaim?: (itemId: string, priority: 1 | 2 | 3, note?: string) => void
  onUnclaim?: (itemId: string) => void
  onAssign?: (itemId: string, characterId: string, characterName: string, quantity?: number) => void
  onSendToTreasury?: (itemId: string) => void
  onTriggerRollOff?: (itemId: string) => void
  onCurrencyChange?: (currency: LootSession['currency'], splitMethod: LootSession['currencySplitMethod']) => void
  onFinalize?: () => void
  onCancel?: () => void
}

export function LootPanel({
  session,
  isDM,
  currentCharacterId,
  currentCharacterName,
  connectedPlayers = [],
  isLoading = false,
  onCreateSession,
  onAddItem,
  onClaim,
  onUnclaim,
  onAssign,
  onSendToTreasury,
  onTriggerRollOff,
  onCurrencyChange,
  onFinalize,
  onCancel,
}: LootPanelProps) {
  // Extract connected characters from players
  const connectedCharacters = useMemo(() => {
    const chars: Array<{ id: string; name: string }> = []
    connectedPlayers.forEach((player) => {
      player.characters.forEach((char) => {
        chars.push({ id: String(char.odNumber), name: char.name })
      })
    })
    return chars
  }, [connectedPlayers])

  const characterIds = connectedCharacters.map((c) => c.id)
  const characterNames = Object.fromEntries(
    connectedCharacters.map((c) => [c.id, c.name])
  )

  // Sort items by status (contested first)
  const sortedItems = useMemo(() => {
    if (!session) return []
    return sortItemsByStatus(session.items)
  }, [session])

  const contestedItems = session ? getContestedItems(session) : []
  const allResolved = session ? areAllItemsResolved(session) : false

  // Status labels
  const statusLabels: Record<LootSession['status'], { label: string; color: string }> = {
    draft: { label: 'Brouillon', color: 'text-gray-400' },
    claiming: { label: 'Réclamations en cours', color: 'text-blue-400' },
    resolving: { label: 'Résolution', color: 'text-orange-400' },
    completed: { label: 'Terminé', color: 'text-green-400' },
    cancelled: { label: 'Annulé', color: 'text-red-400' },
  }

  // Split dialog state
  const [splitDialogOpen, setSplitDialogOpen] = useState(false)
  const [splitItem, setSplitItem] = useState<LootItem | null>(null)
  const [splitTargetChar, setSplitTargetChar] = useState<{ id: string; name: string } | null>(null)

  const handleRequestSplit = (item: LootItem, character: { id: string; name: string }) => {
    setSplitItem(item)
    setSplitTargetChar(character)
    setSplitDialogOpen(true)
  }

  const handleSplitConfirm = (itemId: string, characterId: string, characterName: string, quantity: number) => {
    onAssign?.(itemId, characterId, characterName, quantity)
    setSplitDialogOpen(false)
    setSplitItem(null)
    setSplitTargetChar(null)
  }

  const handleSplitClose = () => {
    setSplitDialogOpen(false)
    setSplitItem(null)
    setSplitTargetChar(null)
  }

  // No active session
  if (!session && !isLoading) {
    return (
      <Card className="border-amber-500/30">
        <CardContent className="py-12 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-amber-400 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Pas de session de butin active</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {isDM
              ? "Créez une session de distribution de butin après un combat."
              : "Attendez que le MJ démarre une session de distribution."}
          </p>
          {isDM && onCreateSession && (
            <Button onClick={onCreateSession} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="w-4 h-4 mr-2" />
              Créer une session
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="border-amber-500/30">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-amber-400" />
          <p className="text-muted-foreground">Chargement de la session...</p>
        </CardContent>
      </Card>
    )
  }

  if (!session) return null

  const statusInfo = statusLabels[session.status]
  const isActive = session.status === 'claiming' || session.status === 'resolving'

  return (
    <Card className="border-amber-500/30 flex flex-col h-full">
      {/* Header */}
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-400">
            <Trophy className="w-5 h-5" />
            Distribution du butin
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Timer (if deadline set) */}
            {session.claimingDeadline && isActive && (
              <Badge variant="outline" className="text-xs">
                <Timer className="w-3 h-3 mr-1" />
                {formatTimeRemaining(session.claimingDeadline)}
              </Badge>
            )}
            {/* Status badge */}
            <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
          <span>{session.items.length} objet(s)</span>
          {contestedItems.length > 0 && (
            <span className="text-orange-400">{contestedItems.length} contesté(s)</span>
          )}
          {connectedCharacters.length > 0 && (
            <span>{connectedCharacters.length} personnage(s)</span>
          )}
        </div>
      </CardHeader>

      <Separator />

      {/* Content */}
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {/* Currency section */}
            <LootCurrencyDisplay
              currency={session.currency}
              splitMethod={session.currencySplitMethod}
              isDM={isDM}
              characterIds={characterIds}
              characterNames={characterNames}
              onCurrencyChange={onCurrencyChange}
            />

            {/* Items section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Objets ({session.items.length})
                </h3>
                {isDM && isActive && onAddItem && (
                  <Button variant="outline" size="sm" onClick={onAddItem}>
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                )}
              </div>

              {sortedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Aucun objet dans le butin</p>
                  {isDM && onAddItem && (
                    <Button
                      variant="link"
                      className="text-amber-400 mt-2"
                      onClick={onAddItem}
                    >
                      Ajouter des objets
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedItems.map((item) => (
                    <LootItemCard
                      key={item.id}
                      item={item}
                      isDM={isDM}
                      currentCharacterId={currentCharacterId}
                      currentCharacterName={currentCharacterName}
                      connectedCharacters={connectedCharacters}
                      onClaim={onClaim}
                      onUnclaim={onUnclaim}
                      onAssign={onAssign}
                      onSendToTreasury={onSendToTreasury}
                      onTriggerRollOff={onTriggerRollOff}
                      onRequestSplit={handleRequestSplit}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>

      {/* Footer actions (DM only) */}
      {isDM && isActive && (
        <>
          <Separator />
          <div className="p-4 flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onFinalize}
              disabled={!allResolved}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Finaliser
            </Button>
          </div>
          {!allResolved && (
            <p className="px-4 pb-4 text-xs text-muted-foreground text-center">
              Tous les objets doivent être attribués ou envoyés au trésor avant de finaliser.
            </p>
          )}
        </>
      )}

      {/* Split item dialog */}
      <SplitItemDialog
        isOpen={splitDialogOpen}
        onClose={handleSplitClose}
        item={splitItem}
        targetCharacter={splitTargetChar}
        onConfirm={handleSplitConfirm}
      />
    </Card>
  )
}
