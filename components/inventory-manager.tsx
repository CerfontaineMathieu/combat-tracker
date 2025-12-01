"use client"

import { useState, useEffect } from "react"
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Coins,
  Backpack,
  Pill,
  Box,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { CharacterInventory, EquipmentItem, ConsumableItem, MiscItem, CurrencyInventory } from "@/lib/types"
import { DEFAULT_INVENTORY } from "@/lib/types"

interface InventoryManagerProps {
  characterName: string
  inventory: CharacterInventory
  onInventoryChange: (inventory: CharacterInventory) => void
  trigger?: React.ReactNode
  readonly?: boolean
}

export function InventoryManager({
  characterName,
  inventory = DEFAULT_INVENTORY,
  onInventoryChange,
  trigger,
  readonly = false,
}: InventoryManagerProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("equipment")

  // Local inventory state to prevent staleness
  const [localInventory, setLocalInventory] = useState(inventory)

  // Sync local inventory when dialog opens (not while editing)
  useEffect(() => {
    if (open) {
      console.log('[InventoryManager] Dialog opened, syncing localInventory with prop:', inventory)
      setLocalInventory(inventory)
    }
  }, [open])

  // Also sync when inventory prop changes BUT only if dialog is closed
  useEffect(() => {
    if (!open) {
      console.log('[InventoryManager] Dialog closed, syncing localInventory with prop:', inventory)
      setLocalInventory(inventory)
    } else {
      console.log('[InventoryManager] Inventory prop changed while dialog OPEN - IGNORING:', inventory)
    }
  }, [inventory, open])

  // Equipment state
  const [newEquipmentName, setNewEquipmentName] = useState("")

  // Consumables state
  const [newConsumableName, setNewConsumableName] = useState("")
  const [newConsumableQty, setNewConsumableQty] = useState("1")

  // Currency local state
  const [localCurrency, setLocalCurrency] = useState(inventory.currency)

  // Sync local currency when inventory prop changes BUT only if dialog is closed
  useEffect(() => {
    if (!open) {
      setLocalCurrency(inventory.currency)
    }
  }, [inventory.currency, open])

  // Also sync currency when dialog opens
  useEffect(() => {
    if (open) {
      setLocalCurrency(inventory.currency)
    }
  }, [open])

  // Items state
  const [newItemName, setNewItemName] = useState("")
  const [newItemDesc, setNewItemDesc] = useState("")

  // Equipment handlers
  const addEquipment = () => {
    if (!newEquipmentName.trim()) return
    const newItem: EquipmentItem = {
      id: `eq-${Date.now()}`,
      name: newEquipmentName.trim(),
      equipped: false,
    }
    console.log('[InventoryManager] Adding equipment. Current localInventory:', localInventory)
    const updatedInventory = {
      ...localInventory,
      equipment: [...localInventory.equipment, newItem],
    }
    console.log('[InventoryManager] Updated inventory after adding equipment:', updatedInventory)
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setNewEquipmentName("")
  }

  const toggleEquipped = (id: string) => {
    const updatedInventory = {
      ...localInventory,
      equipment: localInventory.equipment.map(item =>
        item.id === id ? { ...item, equipped: !item.equipped } : item
      ),
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
  }

  const removeEquipment = (id: string) => {
    const updatedInventory = {
      ...localInventory,
      equipment: localInventory.equipment.filter(item => item.id !== id),
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
  }

  // Consumable handlers
  const addConsumable = () => {
    if (!newConsumableName.trim()) return
    const qty = parseInt(newConsumableQty) || 1
    const newItem: ConsumableItem = {
      id: `cons-${Date.now()}`,
      name: newConsumableName.trim(),
      quantity: Math.max(1, qty),
    }
    console.log('[InventoryManager] Adding consumable. Current localInventory:', localInventory)
    const updatedInventory = {
      ...localInventory,
      consumables: [...localInventory.consumables, newItem],
    }
    console.log('[InventoryManager] Updated inventory after adding consumable:', updatedInventory)
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setNewConsumableName("")
    setNewConsumableQty("1")
  }

  const updateConsumableQty = (id: string, delta: number) => {
    const updatedInventory = {
      ...localInventory,
      consumables: localInventory.consumables
        .map(item =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0),
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
  }

  const removeConsumable = (id: string) => {
    const updatedInventory = {
      ...localInventory,
      consumables: localInventory.consumables.filter(item => item.id !== id),
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
  }

  // Currency handlers
  const handleCurrencyInputChange = (type: keyof CurrencyInventory, value: string) => {
    // Update local state immediately for responsive UI
    const numValue = parseInt(value) || 0
    setLocalCurrency(prev => ({ ...prev, [type]: Math.max(0, numValue) }))
  }

  const saveCurrency = () => {
    // Save to parent when user finishes editing
    const updatedInventory = {
      ...localInventory,
      currency: localCurrency,
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
  }

  const adjustCurrency = (type: keyof CurrencyInventory, delta: number) => {
    const newValue = Math.max(0, localCurrency[type] + delta)
    const newCurrency = { ...localCurrency, [type]: newValue }
    setLocalCurrency(newCurrency)
    // Save immediately for button clicks
    const updatedInventory = {
      ...localInventory,
      currency: newCurrency,
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
  }

  // Item handlers
  const addItem = () => {
    if (!newItemName.trim()) return
    const newItem: MiscItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      description: newItemDesc.trim() || undefined,
    }
    const updatedInventory = {
      ...localInventory,
      items: [...localInventory.items, newItem],
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setNewItemName("")
    setNewItemDesc("")
  }

  const removeItem = (id: string) => {
    const updatedInventory = {
      ...localInventory,
      items: localInventory.items.filter(item => item.id !== id),
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
  }

  // Calculate total currency value in gold pieces
  const getTotalGoldValue = (curr: CurrencyInventory) => {
    return (
      curr.platinum * 10 +
      curr.gold +
      curr.electrum * 0.5 +
      curr.silver * 0.1 +
      curr.copper * 0.01
    ).toFixed(2)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Backpack className="w-4 h-4" />
            Inventaire
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-gold flex items-center gap-2">
            <Backpack className="w-5 h-5" />
            Inventaire de {characterName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="equipment" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Équipement</span>
              <span className="sm:hidden">Équip.</span>
            </TabsTrigger>
            <TabsTrigger value="consumables" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5">
              <Pill className="w-4 h-4" />
              <span className="hidden sm:inline">Consommables</span>
              <span className="sm:hidden">Conso.</span>
            </TabsTrigger>
            <TabsTrigger value="currency" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5">
              <Coins className="w-4 h-4" />
              <span>Monnaie</span>
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-1 text-xs sm:text-sm flex-col sm:flex-row py-2 sm:py-1.5">
              <Box className="w-4 h-4" />
              <span>Objets</span>
            </TabsTrigger>
          </TabsList>

          {/* EQUIPMENT TAB */}
          <TabsContent value="equipment" className="space-y-3">
            {!readonly && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de l'équipement..."
                  value={newEquipmentName}
                  onChange={(e) => setNewEquipmentName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addEquipment()}
                  className="flex-1"
                />
                <Button onClick={addEquipment} size="icon" className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            <ScrollArea className="h-[300px] pr-4">
              {localInventory.equipment.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun équipement</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {localInventory.equipment.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border transition-smooth",
                        item.equipped
                          ? "bg-emerald/10 border-emerald/30"
                          : "bg-secondary/30 border-border/50"
                      )}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-2 shrink-0",
                          item.equipped && "text-emerald"
                        )}
                        onClick={() => toggleEquipped(item.id)}
                        disabled={readonly}
                      >
                        {item.equipped ? "Équipé" : "Non équipé"}
                      </Button>
                      <span className="flex-1 text-sm">{item.name}</span>
                      {!readonly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-crimson hover:text-crimson/80"
                          onClick={() => removeEquipment(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* CONSUMABLES TAB */}
          <TabsContent value="consumables" className="space-y-3">
            {!readonly && (
              <div className="flex gap-2">
                <Input
                  placeholder="Nom du consommable..."
                  value={newConsumableName}
                  onChange={(e) => setNewConsumableName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addConsumable()}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="1"
                  placeholder="Qté"
                  value={newConsumableQty}
                  onChange={(e) => setNewConsumableQty(e.target.value)}
                  className="w-20"
                />
                <Button onClick={addConsumable} size="icon" className="shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            <ScrollArea className="h-[300px] pr-4">
              {localInventory.consumables.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Pill className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun consommable</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {localInventory.consumables.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-2 rounded-lg border bg-secondary/30 border-border/50"
                    >
                      <span className="flex-1 text-sm">{item.name}</span>
                      <div className="flex items-center gap-1">
                        {!readonly && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateConsumableQty(item.id, -1)}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        )}
                        <Badge variant="outline" className="min-w-[3rem] justify-center">
                          {item.quantity}
                        </Badge>
                        {!readonly && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => updateConsumableQty(item.id, 1)}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-crimson hover:text-crimson/80"
                              onClick={() => removeConsumable(item.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* CURRENCY TAB */}
          <TabsContent value="currency" className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              Valeur totale: <span className="text-gold font-semibold">{getTotalGoldValue(localCurrency)} po</span>
            </div>

            <div className="space-y-3">
              {[
                { key: 'platinum' as const, label: 'Platine (pp)', abbr: 'pp', color: 'text-slate-300' },
                { key: 'gold' as const, label: 'Or (po)', abbr: 'po', color: 'text-gold' },
                { key: 'electrum' as const, label: 'Électrum (pe)', abbr: 'pe', color: 'text-cyan-400' },
                { key: 'silver' as const, label: 'Argent (pa)', abbr: 'pa', color: 'text-slate-400' },
                { key: 'copper' as const, label: 'Cuivre (pc)', abbr: 'pc', color: 'text-orange-600' },
              ].map(({ key, label, abbr, color }) => (
                <div key={key} className="flex items-center gap-2">
                  <label className={cn("flex-1 text-sm font-medium", color)}>
                    {label}
                  </label>
                  <div className="flex items-center gap-1">
                    {!readonly && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => adjustCurrency(key, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    )}
                    <Input
                      type="number"
                      min="0"
                      value={localCurrency[key]}
                      onChange={(e) => handleCurrencyInputChange(key, e.target.value)}
                      onBlur={saveCurrency}
                      className="w-24 text-center"
                      disabled={readonly}
                    />
                    {!readonly && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => adjustCurrency(key, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Les modifications sont synchronisées automatiquement
            </div>
          </TabsContent>

          {/* ITEMS TAB */}
          <TabsContent value="items" className="space-y-3">
            {!readonly && (
              <div className="space-y-2">
                <Input
                  placeholder="Nom de l'objet..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
                <Input
                  placeholder="Description (optionnel)..."
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addItem()}
                />
                <Button onClick={addItem} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            )}

            <ScrollArea className="h-[300px] pr-4">
              {localInventory.items.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Box className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun objet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {localInventory.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border bg-secondary/30 border-border/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        {!readonly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-crimson hover:text-crimson/80 shrink-0"
                            onClick={() => removeItem(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {readonly && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
            Consultation uniquement - Vous ne pouvez pas modifier cet inventaire
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
