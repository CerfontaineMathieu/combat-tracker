"use client"

import { useState, useCallback, useEffect } from "react"
import { LootPanel } from "./loot-panel"
import { RollOffDialog } from "./roll-off-dialog"
import { AddLootItemDialog } from "./add-loot-item-dialog"
import { useSocketContext } from "@/lib/socket-context/useSocket"
import { toast } from "sonner"
import type { LootItemType, LootItemRarity, ResistanceType } from "@/lib/types"

interface LootPanelConnectedProps {
  currentCharacterId?: string
  currentCharacterName?: string
}

export function LootPanelConnected({
  currentCharacterId,
  currentCharacterName,
}: LootPanelConnectedProps) {
  const {
    state,
    createLootSession,
    addLootItem,
    claimLootItem,
    unclaimLootItem,
    assignLootItem,
    sendToTreasury,
    unassignLootItem,
    triggerRollOff,
    updateLootCurrency,
    finalizeLoot,
    cancelLoot,
    clearRollOffResult,
  } = useSocketContext()

  const [showAddItemDialog, setShowAddItemDialog] = useState(false)

  const isDM = state.mode === 'mj'
  const session = state.lootSession
  const pendingRollOff = state.pendingRollOff
  const rollOffResult = state.rollOffResult
  const lootError = state.lootError
  const lootDistributions = state.lootDistributions

  // Show error toasts
  useEffect(() => {
    if (lootError) {
      toast.error(`Erreur: ${lootError.error}`)
    }
  }, [lootError])

  // Show success toast when loot is finalized
  useEffect(() => {
    if (lootDistributions && lootDistributions.length > 0) {
      toast.success("Butin distribué avec succès!")
    }
  }, [lootDistributions])

  // Create session handler
  const handleCreateSession = useCallback(() => {
    createLootSession({})
  }, [createLootSession])

  // Add item handler
  const handleAddItem = useCallback((item: {
    name: string
    description?: string
    itemType: LootItemType
    rarity: LootItemRarity
    quantity: number
    isIdentified: boolean
    estimatedValueGp?: number
    linkedSpell?: { id: number; name: string; level: number }
    resistanceType?: ResistanceType
  }) => {
    addLootItem(item)
  }, [addLootItem])

  // Claim handler
  const handleClaim = useCallback((itemId: string, priority: 1 | 2 | 3, note?: string) => {
    if (!currentCharacterId || !currentCharacterName) return
    claimLootItem({
      itemId,
      characterId: currentCharacterId,
      characterName: currentCharacterName,
      priority,
      note,
    })
  }, [claimLootItem, currentCharacterId, currentCharacterName])

  // Unclaim handler
  const handleUnclaim = useCallback((itemId: string) => {
    if (!currentCharacterId) return
    unclaimLootItem({
      itemId,
      characterId: currentCharacterId,
    })
  }, [unclaimLootItem, currentCharacterId])

  // Assign handler (with optional quantity for splitting)
  const handleAssign = useCallback((itemId: string, characterId: string, characterName: string, quantity?: number) => {
    console.log('[Loot] Assigning item:', { itemId, characterId, characterName, quantity })
    assignLootItem({ itemId, characterId, characterName, quantity })
  }, [assignLootItem])

  // Treasury handler
  const handleSendToTreasury = useCallback((itemId: string) => {
    sendToTreasury(itemId)
  }, [sendToTreasury])

  // Unassign handler
  const handleUnassign = useCallback((itemId: string) => {
    unassignLootItem(itemId)
  }, [unassignLootItem])

  // Roll-off handler
  const handleTriggerRollOff = useCallback((itemId: string) => {
    triggerRollOff(itemId)
  }, [triggerRollOff])

  // Currency handler
  const handleCurrencyChange = useCallback((
    currency: { platinum: number; gold: number; electrum: number; silver: number; copper: number },
    splitMethod: 'equal' | 'manual'
  ) => {
    updateLootCurrency({ currency, splitMethod })
  }, [updateLootCurrency])

  // Finalize handler
  const handleFinalize = useCallback(() => {
    finalizeLoot()
  }, [finalizeLoot])

  // Cancel handler
  const handleCancel = useCallback(() => {
    cancelLoot()
  }, [cancelLoot])

  // Close roll-off dialog
  const handleCloseRollOff = useCallback(() => {
    clearRollOffResult()
  }, [clearRollOffResult])

  return (
    <div className="h-full flex flex-col">
      <LootPanel
        session={session}
        isDM={isDM}
        currentCharacterId={currentCharacterId}
        currentCharacterName={currentCharacterName}
        connectedPlayers={state.connectedPlayers}
        isLoading={false}
        onCreateSession={handleCreateSession}
        onAddItem={() => setShowAddItemDialog(true)}
        onClaim={handleClaim}
        onUnclaim={handleUnclaim}
        onAssign={handleAssign}
        onUnassign={handleUnassign}
        onSendToTreasury={handleSendToTreasury}
        onTriggerRollOff={handleTriggerRollOff}
        onCurrencyChange={handleCurrencyChange}
        onFinalize={handleFinalize}
        onCancel={handleCancel}
      />

      {/* Add item dialog */}
      <AddLootItemDialog
        isOpen={showAddItemDialog}
        onClose={() => setShowAddItemDialog(false)}
        onAdd={handleAddItem}
      />

      {/* Roll-off dialog */}
      <RollOffDialog
        isOpen={!!pendingRollOff || !!rollOffResult}
        itemName={pendingRollOff?.itemName || rollOffResult?.itemName || ""}
        participants={pendingRollOff?.participants || []}
        result={rollOffResult}
        onClose={handleCloseRollOff}
      />
    </div>
  )
}
