"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Coins,
  Backpack,
  Pill,
  Search,
  X,
  BookOpen,
  Scroll,
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
import { toast } from "sonner"
import type { CharacterInventory, EquipmentItem, ConsumableItem, MiscItem, CurrencyInventory, CatalogItem, CatalogSpell, ResistanceType } from "@/lib/types"
import { DEFAULT_INVENTORY } from "@/lib/types"
import { ItemAutocomplete } from "@/components/item-autocomplete"
import { ItemPickerDialog } from "@/components/item-picker-dialog"
import { ScrollSpellDialog } from "@/components/scroll-spell-dialog"
import { ResistanceTypeDialog } from "@/components/resistance-type-dialog"
import { SpellDetail } from "@/components/spell-detail"
import { EquipmentSilhouette } from "@/components/equipment-silhouette"
import { SlotPickerDialog } from "@/components/slot-picker-dialog"
import type { EquipmentSlot } from "@/lib/types"
import { SLOT_NAMES, getSlotTypesFromCatalog } from "@/lib/types"

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
  if (rarityLower === "très rare" || rarityLower === "tres rare" || rarityLower === "very rare" || rarityLower === "very_rare") {
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

// Rarity label translation (English -> French)
function getRarityLabel(rarity: string | null | undefined): string {
  if (!rarity) return "";
  const rarityLower = rarity.toLowerCase();

  if (rarityLower === "common") return "Commun";
  if (rarityLower === "uncommon") return "Peu commun";
  if (rarityLower === "rare") return "Rare";
  if (rarityLower === "very_rare" || rarityLower === "very rare") return "Très rare";
  if (rarityLower === "legendary") return "Légendaire";
  if (rarityLower === "artifact") return "Artéfact";
  return rarity; // Return as-is if already French or unknown
}

// Helper to check if a catalog item requires attunement (from Notion properties)
function checkRequiresAttunement(properties: Record<string, unknown> | undefined | null): boolean {
  if (!properties) return false
  // Check for checkbox (boolean true)
  if (properties.Harmonisation === true) return true
  if (properties.harmonisation === true) return true
  // Check for select/text "Oui"
  if (properties.Harmonisation === "Oui") return true
  if (properties.harmonisation === "Oui") return true
  return false
}

// Resistance type color mapping (matching resistance-type-dialog.tsx)
function getResistanceStyle(type: string): string {
  switch (type) {
    case 'Acide':
      return 'bg-lime-500/20 text-lime-400 border-lime-500/50'
    case 'Froid':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
    case 'Feu':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/50'
    case 'Force':
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
    case 'Foudre':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
    case 'Nécrotique':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/50'
    case 'Poison':
      return 'bg-green-500/20 text-green-400 border-green-500/50'
    case 'Psychique':
      return 'bg-pink-500/20 text-pink-400 border-pink-500/50'
    case 'Radiant':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/50'
    case 'Tonnerre':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
    default:
      return 'bg-blue-500/20 text-blue-400 border-blue-500/50'
  }
}

// Item detail type for the detail dialog
type DetailItem = {
  name: string;
  description?: string;
  rarity?: string;
  type: 'equipment' | 'consumable' | 'misc';
  quantity?: number;
  equipped?: boolean;
  linkedSpell?: {
    id: number;
    name: string;
    level: number;
  };
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

  // Slot picker state
  const [slotPickerOpen, setSlotPickerOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null)

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
  const [equipmentSearch, setEquipmentSearch] = useState("")

  // Consumables state
  const [newConsumableName, setNewConsumableName] = useState("")
  const [newConsumableQty, setNewConsumableQty] = useState("1")
  const [consumableSearch, setConsumableSearch] = useState("")

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
  const [newItemQty, setNewItemQty] = useState("1")

  // Detail dialog state
  const [detailItem, setDetailItem] = useState<DetailItem | null>(null)
  const [viewingDetailSpell, setViewingDetailSpell] = useState<CatalogSpell | null>(null)

  // Catalog item storage for adding with details
  const [pendingEquipment, setPendingEquipment] = useState<{description?: string, rarity?: string, catalogNotionId?: string}>({})
  const [pendingConsumable, setPendingConsumable] = useState<{description?: string, rarity?: string, catalogNotionId?: string}>({})
  const [pendingItem, setPendingItem] = useState<{description?: string, rarity?: string, catalogNotionId?: string}>({})

  // Pending items for scroll spell selection and resistance type selection
  const [pendingScrollItem, setPendingScrollItem] = useState<CatalogItem | null>(null)
  const [pendingResistanceItem, setPendingResistanceItem] = useState<CatalogItem | null>(null)

  // Filtered lists based on search
  const filteredEquipment = useMemo(() => {
    if (!equipmentSearch.trim()) return localInventory.equipment
    const search = equipmentSearch.toLowerCase()
    return localInventory.equipment.filter(item =>
      item.name.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search) ||
      item.rarity?.toLowerCase().includes(search)
    )
  }, [localInventory.equipment, equipmentSearch])

  const filteredConsumables = useMemo(() => {
    if (!consumableSearch.trim()) return localInventory.consumables
    const search = consumableSearch.toLowerCase()
    return localInventory.consumables.filter(item =>
      item.name.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search) ||
      item.rarity?.toLowerCase().includes(search) ||
      item.linkedSpell?.name.toLowerCase().includes(search) ||
      item.resistanceType?.toLowerCase().includes(search)
    )
  }, [localInventory.consumables, consumableSearch])

  // Equipment handlers
  const addEquipment = () => {
    if (!newEquipmentName.trim()) return
    const newItem: EquipmentItem = {
      id: `eq-${Date.now()}`,
      name: newEquipmentName.trim(),
      equipped: false,
      description: pendingEquipment.description,
      rarity: pendingEquipment.rarity,
      catalogNotionId: pendingEquipment.catalogNotionId,
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

  // Add equipment directly from catalog item selection
  const addEquipmentFromCatalog = (item: CatalogItem) => {
    // Get compatible slot types from catalog properties
    const slotTypes = getSlotTypesFromCatalog(item)

    const newItem: EquipmentItem = {
      id: `eq-${Date.now()}`,
      name: item.name,
      equipped: false,
      slotTypes: slotTypes.length > 0 ? slotTypes : undefined,
      requiresAttunement: checkRequiresAttunement(item.properties),
      description: item.description || undefined,
      rarity: item.rarity || undefined,
      catalogNotionId: item.notion_id,
    }
    const updatedInventory = {
      ...localInventory,
      equipment: [...localInventory.equipment, newItem],
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setNewEquipmentName("")
    setPendingEquipment({})
  }

  // Attunement tracking (max 3 equipped items that require attunement)
  const attunedCount = localInventory.equipment.filter(
    item => item.equipped && item.requiresAttunement
  ).length

  const toggleEquipped = (id: string) => {
    const item = localInventory.equipment.find(i => i.id === id)
    if (!item) return

    // If unequipping, just toggle off
    if (item.equipped) {
      const updatedInventory = {
        ...localInventory,
        equipment: localInventory.equipment.map(i =>
          i.id === id ? { ...i, equipped: false, slot: null } : i
        ),
      }
      setLocalInventory(updatedInventory)
      onInventoryChange(updatedInventory)
      return
    }

    // If trying to equip an item that requires attunement, check limit
    if (item.requiresAttunement && attunedCount >= 3) {
      toast.warning("Vous avez déjà 3 objets harmonisés équipés", {
        description: "Déséquipez un objet harmonisé avant d'en équiper un autre."
      })
      return
    }

    // If item has slotTypes, find first available slot and unequip existing item in that slot
    if (item.slotTypes && item.slotTypes.length > 0) {
      const targetSlot = item.slotTypes[0] // Use first compatible slot
      const updatedInventory = {
        ...localInventory,
        equipment: localInventory.equipment.map(i => {
          // Unequip the item currently in this slot
          if (i.slot === targetSlot && i.id !== id) {
            return { ...i, equipped: false, slot: null }
          }
          // Equip the selected item in this slot
          if (i.id === id) {
            return { ...i, equipped: true, slot: targetSlot }
          }
          return i
        }),
      }
      setLocalInventory(updatedInventory)
      onInventoryChange(updatedInventory)
      return
    }

    // For items without slotTypes, just toggle equipped status
    const updatedInventory = {
      ...localInventory,
      equipment: localInventory.equipment.map(i =>
        i.id === id ? { ...i, equipped: true } : i
      ),
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
  }

  // Slot picker handlers
  const handleSlotClick = (slot: EquipmentSlot) => {
    setSelectedSlot(slot)
    setSlotPickerOpen(true)
  }

  const handleSlotSelect = (slot: EquipmentSlot, itemId: string | null) => {
    const itemToEquip = itemId ? localInventory.equipment.find(i => i.id === itemId) : null

    // Check attunement limit
    if (itemToEquip?.requiresAttunement && !itemToEquip.equipped) {
      const currentlyAttuned = localInventory.equipment.filter(i => i.equipped && i.requiresAttunement && i.id !== itemId).length
      if (currentlyAttuned >= 3) {
        toast.warning("Vous avez déjà 3 objets harmonisés équipés", {
          description: "Déséquipez un objet harmonisé avant d'en équiper un autre."
        })
        return
      }
    }

    const updatedInventory = {
      ...localInventory,
      equipment: localInventory.equipment.map(item => {
        // Unequip the item currently in this slot
        if (item.slot === slot && item.id !== itemId) {
          return { ...item, equipped: false, slot: null }
        }
        // Equip the selected item in this slot
        if (item.id === itemId) {
          return { ...item, equipped: true, slot }
        }
        return item
      }),
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
  }

  // Auto-equip item to the first available compatible slot
  const handleAutoEquip = (item: EquipmentItem) => {
    if (!item.slotTypes || item.slotTypes.length === 0) {
      toast.info("Type d'équipement inconnu", { description: "Équipez manuellement via la silhouette" })
      return
    }

    // Check attunement limit before auto-equipping
    if (item.requiresAttunement && attunedCount >= 3) {
      toast.warning("Vous avez déjà 3 objets harmonisés équipés", {
        description: "Déséquipez un objet harmonisé avant d'en équiper un autre."
      })
      return
    }

    // Find the first available slot
    for (const slotType of item.slotTypes) {
      const occupied = localInventory.equipment.find(e => e.slot === slotType)
      if (!occupied) {
        handleSlotSelect(slotType, item.id)
        toast.success(`${item.name} équipé`, { description: SLOT_NAMES[slotType] })
        return
      }
    }

    // All compatible slots are occupied
    const slotNames = item.slotTypes.map(s => SLOT_NAMES[s]).join(', ')
    toast.warning(`Aucun emplacement libre`, { description: `Emplacements compatibles: ${slotNames}` })
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
      catalogNotionId: pendingConsumable.catalogNotionId,
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

  // Add consumable directly from catalog item selection (default quantity: 1)
  const addConsumableFromCatalog = (item: CatalogItem) => {
    // Intercept scrolls (parchemins) - require spell selection
    if (item.subcategory === 'parchemin') {
      setPendingScrollItem(item)
      return
    }

    // Intercept resistance potions - require type selection
    if (item.name.toLowerCase().includes('résistance') && item.subcategory === 'potion') {
      setPendingResistanceItem(item)
      return
    }

    // Normal flow for other consumables
    const newItem: ConsumableItem = {
      id: `cons-${Date.now()}`,
      name: item.name,
      quantity: 1,
      description: item.description || undefined,
      rarity: item.rarity || undefined,
      catalogNotionId: item.notion_id,
    }
    const updatedInventory = {
      ...localInventory,
      consumables: [...localInventory.consumables, newItem],
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setNewConsumableName("")
    setNewConsumableQty("1")
    setPendingConsumable({})
  }

  // Handle scroll spell selection confirmation
  const handleScrollConfirm = (item: CatalogItem, spell: CatalogSpell) => {
    const newItem: ConsumableItem = {
      id: `cons-${Date.now()}`,
      name: item.name,
      quantity: 1,
      description: item.description || undefined,
      rarity: item.rarity || undefined,
      catalogNotionId: item.notion_id,
      linkedSpell: {
        id: spell.id,
        name: spell.name,
        level: spell.level,
      },
    }
    const updatedInventory = {
      ...localInventory,
      consumables: [...localInventory.consumables, newItem],
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setPendingScrollItem(null)
    setNewConsumableName("")
    setNewConsumableQty("1")
  }

  // Handle resistance potion type selection confirmation
  const handleResistanceConfirm = (item: CatalogItem, resistanceType: ResistanceType) => {
    const newItem: ConsumableItem = {
      id: `cons-${Date.now()}`,
      name: item.name,
      quantity: 1,
      description: item.description || undefined,
      rarity: item.rarity || undefined,
      catalogNotionId: item.notion_id,
      resistanceType,
    }
    const updatedInventory = {
      ...localInventory,
      consumables: [...localInventory.consumables, newItem],
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setPendingResistanceItem(null)
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
    const qty = parseInt(newItemQty) || 1
    const newItem: MiscItem = {
      id: `item-${Date.now()}`,
      name: newItemName.trim(),
      quantity: Math.max(1, qty),
      description: newItemDesc.trim() || pendingItem.description,
      rarity: pendingItem.rarity,
      catalogNotionId: pendingItem.catalogNotionId,
    }
    const updatedInventory = {
      ...localInventory,
      items: [...localInventory.items, newItem],
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setNewItemName("")
    setNewItemDesc("")
    setNewItemQty("1")
    setPendingItem({})
  }

  // Add misc item directly from catalog item selection
  const addMiscItemFromCatalog = (item: CatalogItem) => {
    const newItem: MiscItem = {
      id: `item-${Date.now()}`,
      name: item.name,
      quantity: 1,
      description: item.description || undefined,
      rarity: item.rarity || undefined,
      catalogNotionId: item.notion_id,
    }
    const updatedInventory = {
      ...localInventory,
      items: [...localInventory.items, newItem],
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
    setNewItemName("")
    setNewItemDesc("")
    setNewItemQty("1")
    setPendingItem({})
  }

  const updateItemQty = (id: string, delta: number) => {
    const updatedInventory = {
      ...localInventory,
      items: localInventory.items
        .map(item =>
          item.id === id
            ? { ...item, quantity: Math.max(0, (item.quantity || 1) + delta) }
            : item
        )
        .filter(item => (item.quantity || 1) > 0),
    }
    setLocalInventory(updatedInventory)
    onInventoryChange(updatedInventory)
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
      <DialogContent className="bg-card border-border w-[98vw] !max-w-[1400px] sm:!max-w-[1400px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-gold flex items-center gap-2">
            <Backpack className="w-5 h-5" />
            Inventaire de {characterName}
          </DialogTitle>
        </DialogHeader>

        {/* Two-column layout: Silhouette on left, Tabs on right */}
        <div className="flex gap-4 overflow-hidden">
          {/* Left column: Equipment Silhouette */}
          <div className="hidden lg:flex flex-col border-r border-border pr-4 w-[280px] shrink-0">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 text-center">Équipement actif</h3>
            <EquipmentSilhouette
              equipment={localInventory.equipment}
              onSlotClick={handleSlotClick}
              disabled={readonly}
            />
            <p className="text-xs text-muted-foreground text-center mt-2">
              Cliquez sur un emplacement pour équiper
            </p>
          </div>

          {/* Right column: Tabs */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto">
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
                    addEquipmentFromCatalog(item)
                  }}
                  placeholder="Nom de l'équipement..."
                  filterCategory="equipment"
                  className="flex-1"
                />
                <ItemPickerDialog
                  filterCategory="equipment"
                  initialSearch={newEquipmentName}
                  onSelect={(item: CatalogItem) => {
                    addEquipmentFromCatalog(item)
                  }}
                  trigger={
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Search className="w-4 h-4" />
                    </Button>
                  }
                />
              </div>
            )}

            {/* Attunement counter and search */}
            <div className="flex items-center justify-between gap-2">
              {localInventory.equipment.length > 0 ? (
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Filtrer l'équipement..."
                    value={equipmentSearch}
                    onChange={(e) => setEquipmentSearch(e.target.value)}
                    className="pl-8 h-8 text-sm"
                  />
                  {equipmentSearch && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                      onClick={() => setEquipmentSearch("")}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ) : (
                <div />
              )}
              <span className={cn(
                "text-sm text-muted-foreground shrink-0",
                attunedCount >= 3 && "text-amber-500 font-medium"
              )}>
                Harmonisés: {attunedCount}/3
              </span>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              {localInventory.equipment.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun équipement</p>
                </div>
              ) : filteredEquipment.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun résultat pour "{equipmentSearch}"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEquipment.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-2 rounded-lg border transition-smooth",
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{item.name}</span>
                            {item.requiresAttunement && (
                              <span className="text-amber-400 text-xs font-bold" title="Nécessite l'harmonisation">H</span>
                            )}
                            {item.rarity && (
                              <Badge variant="outline" className={`text-xs ${getRarityStyle(item.rarity)}`}>
                                {getRarityLabel(item.rarity)}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Auto-equip button for items with known slot types */}
                          {!item.equipped && !readonly && item.slotTypes && item.slotTypes.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2 text-emerald border-emerald/50 hover:bg-emerald/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAutoEquip(item)
                              }}
                            >
                              Équiper
                            </Button>
                          )}
                          {/* Show slot name if equipped via slot system */}
                          {item.equipped && item.slot && (
                            <Badge variant="outline" className="text-emerald border-emerald/50">
                              {SLOT_NAMES[item.slot]}
                            </Badge>
                          )}
                          {/* Legacy toggle for items without slot types (unknown equipment) */}
                          {(!item.slotTypes || item.slotTypes.length === 0) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 px-2",
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
                          )}
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
                      </div>
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
                    addConsumableFromCatalog(item)
                  }}
                  placeholder="Nom du consommable..."
                  filterCategory="consumable"
                  className="flex-1"
                />
                <ItemPickerDialog
                  filterCategory="consumable"
                  initialSearch={newConsumableName}
                  onSelect={(item: CatalogItem) => {
                    addConsumableFromCatalog(item)
                  }}
                  trigger={
                    <Button variant="outline" size="icon" className="shrink-0">
                      <Search className="w-4 h-4" />
                    </Button>
                  }
                />
              </div>
            )}

            {/* Search filter for consumables */}
            {localInventory.consumables.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrer les consommables..."
                  value={consumableSearch}
                  onChange={(e) => setConsumableSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
                {consumableSearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => setConsumableSearch("")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}

            <ScrollArea className="h-[300px] pr-4">
              {localInventory.consumables.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Pill className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun consommable</p>
                </div>
              ) : filteredConsumables.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun résultat pour "{consumableSearch}"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredConsumables.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "p-2 rounded-lg border bg-secondary/30 border-border/50",
                        (item.description || item.rarity || item.linkedSpell) && "cursor-pointer hover:bg-secondary/50"
                      )}
                      onClick={() => {
                        if (item.description || item.rarity || item.linkedSpell) {
                          setDetailItem({
                            name: item.name,
                            description: item.description,
                            rarity: item.rarity,
                            type: 'consumable',
                            quantity: item.quantity,
                            linkedSpell: item.linkedSpell,
                          })
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{item.name}</span>
                            {item.rarity && (
                              <Badge variant="outline" className={`text-xs ${getRarityStyle(item.rarity)}`}>
                                {getRarityLabel(item.rarity)}
                              </Badge>
                            )}
                            {item.linkedSpell && (
                              <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/50">
                                Niv. {item.linkedSpell.level}: {item.linkedSpell.name}
                              </Badge>
                            )}
                            {item.resistanceType && (
                              <Badge className={`text-xs ${getResistanceStyle(item.resistanceType)}`}>
                                {item.resistanceType}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
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

            </Tabs>
          </div>
        </div>

        {readonly && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
            Consultation uniquement - Vous ne pouvez pas modifier cet inventaire
          </div>
        )}
      </DialogContent>

      {/* Slot Picker Dialog */}
      <SlotPickerDialog
        open={slotPickerOpen}
        onOpenChange={setSlotPickerOpen}
        slot={selectedSlot}
        equipment={localInventory.equipment}
        onSelectItem={handleSlotSelect}
      />

      {/* Item Detail Dialog */}
      <Dialog open={!!detailItem} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold flex items-center gap-2 flex-wrap">
              {detailItem?.name}
              {detailItem?.rarity && (
                <Badge variant="outline" className={`text-xs ${getRarityStyle(detailItem.rarity)}`}>
                  {getRarityLabel(detailItem.rarity)}
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
                  <Package className="w-4 h-4" />
                  <span>Objet</span>
                  {detailItem.quantity !== undefined && (
                    <Badge variant="outline" className="ml-2">
                      Quantité: {detailItem.quantity}
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Description */}
            {detailItem?.description && (
              <div className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                <p className="text-sm whitespace-pre-wrap">{detailItem.description}</p>
              </div>
            )}

            {/* Linked Spell for scrolls */}
            {detailItem?.linkedSpell && !viewingDetailSpell && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Scroll className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium">Sort inscrit</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20"
                  onClick={async () => {
                    // Fetch full spell data
                    try {
                      const response = await fetch(`/api/spells/${detailItem.linkedSpell!.id}`)
                      const data = await response.json()
                      if (data.success && data.spell) {
                        setViewingDetailSpell(data.spell)
                      }
                    } catch (error) {
                      console.error('Error fetching spell:', error)
                    }
                  }}
                >
                  <BookOpen className="w-4 h-4 text-purple-400" />
                  <span className="text-purple-400">
                    Niv. {detailItem.linkedSpell.level}: {detailItem.linkedSpell.name}
                  </span>
                </Button>
              </div>
            )}

            {/* Spell Detail View */}
            {viewingDetailSpell && (
              <div className="space-y-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => setViewingDetailSpell(null)}
                >
                  ← Retour à l'objet
                </Button>
                <div className="max-h-[300px] overflow-y-auto pr-2">
                  <SpellDetail spell={viewingDetailSpell} />
                </div>
              </div>
            )}
          </div>

          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => {
              setDetailItem(null)
              setViewingDetailSpell(null)
            }}
          >
            Fermer
          </Button>
        </DialogContent>
      </Dialog>

      {/* Scroll Spell Selection Dialog */}
      <ScrollSpellDialog
        open={!!pendingScrollItem}
        onOpenChange={(open) => !open && setPendingScrollItem(null)}
        catalogItem={pendingScrollItem}
        onConfirm={handleScrollConfirm}
        onCancel={() => setPendingScrollItem(null)}
      />

      {/* Resistance Type Selection Dialog */}
      <ResistanceTypeDialog
        open={!!pendingResistanceItem}
        onOpenChange={(open) => !open && setPendingResistanceItem(null)}
        catalogItem={pendingResistanceItem}
        onConfirm={handleResistanceConfirm}
        onCancel={() => setPendingResistanceItem(null)}
      />
    </Dialog>
  )
}
