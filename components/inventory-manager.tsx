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
  Search,
  X,
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
import type { CharacterInventory, EquipmentItem, ConsumableItem, MiscItem, CurrencyInventory, CatalogItem } from "@/lib/types"
import { DEFAULT_INVENTORY } from "@/lib/types"
import { ItemAutocomplete } from "@/components/item-autocomplete"
import { ItemPickerDialog } from "@/components/item-picker-dialog"

// Rarity color mapping (D&D style)
function getRarityStyle(rarity: string | null | undefined): string {
  if (!rarity) return "";
  const rarityLower = rarity.toLowerCase();

  if (rarityLower === "commun" || rarityLower === "common") {
    return "bg-zinc-500/20 text-zinc-300 border-zinc-500/50";
  }
  if (rarityLower === "peu commun" || rarityLower === "uncommon") {
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
  }
  if (rarityLower === "rare") {
    return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  }
  if (rarityLower === "très rare" || rarityLower === "tres rare" || rarityLower === "very rare") {
    return "bg-purple-500/20 text-purple-400 border-purple-500/50";
  }
  if (rarityLower === "légendaire" || rarityLower === "legendaire" || rarityLower === "legendary") {
    return "bg-amber-500/20 text-amber-400 border-amber-500/50";
  }
  if (rarityLower === "artéfact" || rarityLower === "artefact" || rarityLower === "artifact") {
    return "bg-red-500/20 text-red-400 border-red-500/50";
  }
  return "";
}

// Item detail type for the detail dialog
type DetailItem = {
  name: string;
  description?: string;
  rarity?: string;
  type: 'equipment' | 'consumable' | 'misc';
  quantity?: number;
  equipped?: boolean;
};

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

  // Detail dialog state
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null)

  // Catalog item storage for adding with details
  const [pendingEquipment, setPendingEquipment] = useState<{description?: string, rarity?: string}>({})
  const [pendingConsumable, setPendingConsumable] = useState<{description?: string, rarity?: string}>({})
  const [pendingItemRarity, setPendingItemRarity] = useState<string | undefined>()

  // Equipment handlers
  const addEquipment = () => {
    if (!newEquipmentName.trim()) return
    const newItem: EquipmentItem = {
      id: `eq-${Date.now()}`,
      name: newEquipmentName.trim(),
      equipped: false,
      description: pendingEquipment.description,
      rarity: pendingEquipment.rarity,
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
    setPendingEquipment({})
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
      description: pendingConsumable.description,
      rarity: pendingConsumable.rarity,
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
    setPendingConsumable({})
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
      rarity: pendingItemRarity,
    }
    const updatedInventory = {
      ...localInventory,
      items: [...localInventory.items, newItem],
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setNewItemName("")
    setNewItemDesc("")
    setPendingItemRarity(undefined)
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
                <ItemAutocomplete
                  value={newEquipmentName}
                  onChange={(val) => {
                    setNewEquipmentName(val)
                    if (!val) setPendingEquipment({})
                  }}
                  onSelect={(item: CatalogItem) => {
                    setNewEquipmentName(item.name)
                    setPendingEquipment({ description: item.description || undefined, rarity: item.rarity || undefined })
                  }}
                  placeholder="Nom de l'équipement..."
                  filterCategory="equipment"
                  className="flex-1"
                />
                <ItemPickerDialog
                  filterCategory="equipment"
                  onSelect={(item: CatalogItem) => {
                    setNewEquipmentName(item.name)
                    setPendingEquipment({ description: item.description || undefined, rarity: item.rarity || undefined })
                  }}
                  trigger={
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Search className="w-4 h-4" />
                    </Button>
                  }
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
                          : "bg-secondary/30 border-border/50",
                        (item.description || item.rarity) && "cursor-pointer hover:bg-secondary/50"
                      )}
                      onClick={() => {
                        if (item.description || item.rarity) {
                          setDetailItem({
                            name: item.name,
                            description: item.description,
                            rarity: item.rarity,
                            type: 'equipment',
                            equipped: item.equipped,
                          })
                        }
                      }}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-2 shrink-0",
                          item.equipped && "text-emerald"
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleEquipped(item.id)
                        }}
                        disabled={readonly}
                      >
                        {item.equipped ? "Équipé" : "Non équipé"}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate">{item.name}</span>
                          {item.rarity && (
                            <Badge variant="outline" className={`text-xs shrink-0 ${getRarityStyle(item.rarity)}`}>
                              {item.rarity}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!readonly && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-crimson hover:text-crimson/80"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeEquipment(item.id)
                          }}
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
                <ItemAutocomplete
                  value={newConsumableName}
                  onChange={(val) => {
                    setNewConsumableName(val)
                    if (!val) setPendingConsumable({})
                  }}
                  onSelect={(item: CatalogItem) => {
                    setNewConsumableName(item.name)
                    setPendingConsumable({ description: item.description || undefined, rarity: item.rarity || undefined })
                  }}
                  placeholder="Nom du consommable..."
                  filterCategory="consumable"
                  className="flex-1"
                />
                <ItemPickerDialog
                  filterCategory="consumable"
                  onSelect={(item: CatalogItem) => {
                    setNewConsumableName(item.name)
                    setPendingConsumable({ description: item.description || undefined, rarity: item.rarity || undefined })
                  }}
                  trigger={
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Search className="w-4 h-4" />
                    </Button>
                  }
                />
                <Input
                  type="number"
                  min="1"
                  placeholder="Qté"
                  value={newConsumableQty}
                  onChange={(e) => setNewConsumableQty(e.target.value)}
                  className="w-16"
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
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border bg-secondary/30 border-border/50",
                        (item.description || item.rarity) && "cursor-pointer hover:bg-secondary/50"
                      )}
                      onClick={() => {
                        if (item.description || item.rarity) {
                          setDetailItem({
                            name: item.name,
                            description: item.description,
                            rarity: item.rarity,
                            type: 'consumable',
                            quantity: item.quantity,
                          })
                        }
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate">{item.name}</span>
                          {item.rarity && (
                            <Badge variant="outline" className={`text-xs shrink-0 ${getRarityStyle(item.rarity)}`}>
                              {item.rarity}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!readonly && (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation()
                              updateConsumableQty(item.id, -1)
                            }}
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
                              onClick={(e) => {
                                e.stopPropagation()
                                updateConsumableQty(item.id, 1)
                              }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-crimson hover:text-crimson/80"
                              onClick={(e) => {
                                e.stopPropagation()
                                removeConsumable(item.id)
                              }}
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
                <div className="flex gap-2">
                  <ItemAutocomplete
                    value={newItemName}
                    onChange={(val) => {
                      setNewItemName(val)
                      if (!val) {
                        setNewItemDesc("")
                        setPendingItemRarity(undefined)
                      }
                    }}
                    onSelect={(item: CatalogItem) => {
                      setNewItemName(item.name)
                      if (item.description) {
                        setNewItemDesc(item.description)
                      }
                      setPendingItemRarity(item.rarity || undefined)
                    }}
                    placeholder="Nom de l'objet..."
                    filterCategory="misc"
                    className="flex-1"
                  />
                  <ItemPickerDialog
                    filterCategory="misc"
                    onSelect={(item: CatalogItem) => {
                      setNewItemName(item.name)
                      if (item.description) {
                        setNewItemDesc(item.description)
                      }
                      setPendingItemRarity(item.rarity || undefined)
                    }}
                    trigger={
                      <Button variant="outline" size="icon" className="shrink-0">
                        <Search className="w-4 h-4" />
                      </Button>
                    }
                  />
                </div>
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
                      className={cn(
                        "p-3 rounded-lg border bg-secondary/30 border-border/50",
                        item.description && "cursor-pointer hover:bg-secondary/50"
                      )}
                      onClick={() => {
                        if (item.description) {
                          setDetailItem({
                            name: item.name,
                            description: item.description,
                            rarity: item.rarity,
                            type: 'misc',
                          })
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.rarity && (
                              <Badge variant="outline" className={`text-xs shrink-0 ${getRarityStyle(item.rarity)}`}>
                                {item.rarity}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                        {!readonly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-crimson hover:text-crimson/80 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeItem(item.id)
                            }}
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

      {/* Item Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold flex items-center gap-2 flex-wrap">
              {detailItem?.name}
              {detailItem?.rarity && (
                <Badge variant="outline" className={`text-xs ${getRarityStyle(detailItem.rarity)}`}>
                  {detailItem.rarity}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Type info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {detailItem?.type === 'equipment' && (
                <>
                  <Package className="w-4 h-4" />
                  <span>Équipement</span>
                  {detailItem.equipped !== undefined && (
                    <Badge variant={detailItem.equipped ? "default" : "outline"} className="ml-2">
                      {detailItem.equipped ? "Équipé" : "Non équipé"}
                    </Badge>
                  )}
                </>
              )}
              {detailItem?.type === 'consumable' && (
                <>
                  <Pill className="w-4 h-4" />
                  <span>Consommable</span>
                  {detailItem.quantity !== undefined && (
                    <Badge variant="outline" className="ml-2">
                      Quantité: {detailItem.quantity}
                    </Badge>
                  )}
                </>
              )}
              {detailItem?.type === 'misc' && (
                <>
                  <Box className="w-4 h-4" />
                  <span>Objet</span>
                </>
              )}
            </div>

            {/* Description */}
            {detailItem?.description && (
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-sm whitespace-pre-wrap">{detailItem.description}</p>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => setDetailItem(null)}
          >
            Fermer
          </Button>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}
