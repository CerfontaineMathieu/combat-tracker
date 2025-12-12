"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Package, Search, Scroll, FlaskConical } from "lucide-react"
import type { LootItemType, LootItemRarity, CatalogItem, CatalogSpell, ResistanceType } from "@/lib/types"
import { LOOT_ITEM_TYPES, LOOT_RARITIES, RESISTANCE_TYPES } from "@/lib/types"
import { ItemAutocomplete } from "@/components/item-autocomplete"
import { ScrollSpellDialog } from "@/components/scroll-spell-dialog"
import { ResistanceTypeDialog } from "@/components/resistance-type-dialog"

// Map catalog category to loot item type
function mapCategoryToLootType(category: string, subcategory?: string | null): LootItemType {
  if (category === 'equipment') {
    if (subcategory === 'arme' || subcategory === 'weapon') return 'weapon'
    if (subcategory === 'armure' || subcategory === 'armor' || subcategory === 'bouclier') return 'armor'
    return 'wondrous'
  }
  if (category === 'consumable') {
    if (subcategory === 'potion') return 'potion'
    if (subcategory === 'parchemin' || subcategory === 'scroll') return 'scroll'
    return 'misc'
  }
  return 'misc'
}

// Map catalog rarity to loot rarity
function mapRarityToLootRarity(rarity: string | null): LootItemRarity {
  if (!rarity) return 'common'
  const r = rarity.toLowerCase()
  if (r === 'commun' || r === 'common') return 'common'
  if (r === 'peu commun' || r === 'uncommon') return 'uncommon'
  if (r === 'rare') return 'rare'
  if (r.includes('très rare') || r === 'very rare') return 'very_rare'
  if (r.includes('légendaire') || r === 'legendary') return 'legendary'
  if (r.includes('artéfact') || r === 'artifact') return 'artifact'
  return 'common'
}

// Check if item is a scroll
function isScrollItem(item: CatalogItem): boolean {
  return item.subcategory === 'parchemin'
}

// Check if item is a resistance potion
function isResistancePotion(item: CatalogItem): boolean {
  if (item.subcategory !== 'potion') return false
  const nameLower = item.name.toLowerCase()
  return nameLower.includes('résistance') || nameLower.includes('resistance')
}

export interface LootItemData {
  name: string
  description?: string
  itemType: LootItemType
  rarity: LootItemRarity
  quantity: number
  isIdentified: boolean
  estimatedValueGp?: number
  linkedSpell?: {
    id: number
    name: string
    level: number
  }
  resistanceType?: ResistanceType
}

interface AddLootItemDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (item: LootItemData) => void
}

export function AddLootItemDialog({ isOpen, onClose, onAdd }: AddLootItemDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [itemType, setItemType] = useState<LootItemType>("misc")
  const [rarity, setRarity] = useState<LootItemRarity>("common")
  const [quantity, setQuantity] = useState(1)
  const [isIdentified, setIsIdentified] = useState(true)
  const [estimatedValueGp, setEstimatedValueGp] = useState<string>("")
  const [selectedFromCatalog, setSelectedFromCatalog] = useState(false)

  // Scroll spell state
  const [linkedSpell, setLinkedSpell] = useState<{ id: number; name: string; level: number } | null>(null)
  const [pendingScrollItem, setPendingScrollItem] = useState<CatalogItem | null>(null)
  const [showScrollDialog, setShowScrollDialog] = useState(false)

  // Resistance potion state
  const [resistanceType, setResistanceType] = useState<ResistanceType | null>(null)
  const [pendingResistanceItem, setPendingResistanceItem] = useState<CatalogItem | null>(null)
  const [showResistanceDialog, setShowResistanceDialog] = useState(false)

  const resetForm = () => {
    setSearchQuery("")
    setName("")
    setDescription("")
    setItemType("misc")
    setRarity("common")
    setQuantity(1)
    setIsIdentified(true)
    setEstimatedValueGp("")
    setSelectedFromCatalog(false)
    setLinkedSpell(null)
    setResistanceType(null)
    setPendingScrollItem(null)
    setPendingResistanceItem(null)
  }

  const applyItemToForm = (item: CatalogItem) => {
    setName(item.name)
    setDescription(item.description || "")
    setItemType(mapCategoryToLootType(item.category, item.subcategory))
    setRarity(mapRarityToLootRarity(item.rarity))
    setSelectedFromCatalog(true)
    // Extract price if available in properties
    if (item.properties?.Prix) {
      const priceStr = String(item.properties.Prix)
      const match = priceStr.match(/(\d+)/)
      if (match) {
        setEstimatedValueGp(match[1])
      }
    }
  }

  const handleCatalogSelect = (item: CatalogItem) => {
    // Check if scroll - needs spell selection
    if (isScrollItem(item)) {
      setPendingScrollItem(item)
      setShowScrollDialog(true)
      return
    }

    // Check if resistance potion - needs type selection
    if (isResistancePotion(item)) {
      setPendingResistanceItem(item)
      setShowResistanceDialog(true)
      return
    }

    // Normal item - apply directly
    applyItemToForm(item)
  }

  const handleScrollConfirm = (item: CatalogItem, spell: CatalogSpell) => {
    applyItemToForm(item)
    setLinkedSpell({
      id: spell.id,
      name: spell.name,
      level: spell.level,
    })
    setShowScrollDialog(false)
    setPendingScrollItem(null)
  }

  const handleScrollCancel = () => {
    setShowScrollDialog(false)
    setPendingScrollItem(null)
  }

  const handleResistanceConfirm = (item: CatalogItem, type: ResistanceType) => {
    applyItemToForm(item)
    setResistanceType(type)
    setShowResistanceDialog(false)
    setPendingResistanceItem(null)
  }

  const handleResistanceCancel = () => {
    setShowResistanceDialog(false)
    setPendingResistanceItem(null)
  }

  const handleSubmit = () => {
    if (!name.trim()) return

    onAdd({
      name: name.trim(),
      description: description.trim() || undefined,
      itemType,
      rarity,
      quantity,
      isIdentified,
      estimatedValueGp: estimatedValueGp ? parseInt(estimatedValueGp, 10) : undefined,
      linkedSpell: linkedSpell || undefined,
      resistanceType: resistanceType || undefined,
    })

    resetForm()
    onClose()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Ajouter un objet au butin
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Search from catalog */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Rechercher dans le catalogue
              </Label>
              <ItemAutocomplete
                value={searchQuery}
                onChange={setSearchQuery}
                onSelect={handleCatalogSelect}
                placeholder="Tapez pour rechercher un objet..."
              />
              {selectedFromCatalog && (
                <p className="text-xs text-green-500">Objet sélectionné du catalogue</p>
              )}
            </div>

            {/* Show linked spell badge if selected */}
            {linkedSpell && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-500/20 border border-purple-500/50">
                <Scroll className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-400">
                  Sort: <span className="font-medium">{linkedSpell.name}</span> (Niv. {linkedSpell.level})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2 text-xs"
                  onClick={() => setLinkedSpell(null)}
                >
                  Modifier
                </Button>
              </div>
            )}

            {/* Show resistance type badge if selected */}
            {resistanceType && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/20 border border-blue-500/50">
                <FlaskConical className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-blue-400">
                  Résistance: <span className="font-medium">{resistanceType}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2 text-xs"
                  onClick={() => setResistanceType(null)}
                >
                  Modifier
                </Button>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">ou saisie manuelle</span>
              </div>
            </div>

            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">Nom de l'objet *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setSelectedFromCatalog(false)
                }}
                placeholder="Épée longue +1"
              />
            </div>

            {/* Item Type and Rarity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={itemType} onValueChange={(v) => setItemType(v as LootItemType)}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOOT_ITEM_TYPES).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="rarity">Rareté</Label>
                <Select value={rarity} onValueChange={(v) => setRarity(v as LootItemRarity)}>
                  <SelectTrigger id="rarity">
                    <SelectValue placeholder="Rareté" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LOOT_RARITIES).map(([key, { label, color }]) => (
                      <SelectItem key={key} value={key}>
                        <span className={color}>{label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Manual spell/resistance selection for manual entry */}
            {itemType === 'scroll' && !linkedSpell && (
              <div className="grid gap-2">
                <Label>Sort du parchemin</Label>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start text-muted-foreground"
                  onClick={() => {
                    setPendingScrollItem({ id: 0, notion_id: '', name, category: 'consumable', subcategory: 'parchemin', source_database: '', description: null, rarity: null, properties: {}, image_url: null, created_at: '', updated_at: '' })
                    setShowScrollDialog(true)
                  }}
                >
                  <Scroll className="w-4 h-4 mr-2" />
                  Sélectionner un sort...
                </Button>
              </div>
            )}

            {itemType === 'potion' && !resistanceType && (
              <div className="grid gap-2">
                <Label>Type de résistance (si applicable)</Label>
                <Select
                  value={resistanceType || "none"}
                  onValueChange={(v) => setResistanceType(v === "none" ? null : v as ResistanceType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optionnel - si potion de résistance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {RESISTANCE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Quantity and Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="value">Valeur estimée (po)</Label>
                <Input
                  id="value"
                  type="number"
                  min={0}
                  value={estimatedValueGp}
                  onChange={(e) => setEstimatedValueGp(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
            </div>

            {/* Identified toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="identified">Objet identifié</Label>
              <Switch
                id="identified"
                checked={isIdentified}
                onCheckedChange={setIsIdentified}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description de l'objet..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scroll spell selection dialog */}
      <ScrollSpellDialog
        open={showScrollDialog}
        onOpenChange={setShowScrollDialog}
        catalogItem={pendingScrollItem}
        onConfirm={handleScrollConfirm}
        onCancel={handleScrollCancel}
      />

      {/* Resistance type selection dialog */}
      <ResistanceTypeDialog
        open={showResistanceDialog}
        onOpenChange={setShowResistanceDialog}
        catalogItem={pendingResistanceItem}
        onConfirm={handleResistanceConfirm}
        onCancel={handleResistanceCancel}
      />
    </>
  )
}
