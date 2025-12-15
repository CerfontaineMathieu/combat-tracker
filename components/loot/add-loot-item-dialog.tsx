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
import { Plus, Package, Search, Scroll, FlaskConical } from "lucide-react"
import type { LootItemType, LootItemRarity, CatalogItem, CatalogSpell, ResistanceType } from "@/lib/types"
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
  if (r.includes('très rare') || r === 'very rare' || r === 'very_rare') return 'very_rare'
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
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [quantity, setQuantity] = useState(1)

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
    setSelectedItem(null)
    setQuantity(1)
    setLinkedSpell(null)
    setResistanceType(null)
    setPendingScrollItem(null)
    setPendingResistanceItem(null)
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

    // Normal item - select directly
    setSelectedItem(item)
    setSearchQuery(item.name)
  }

  const handleScrollConfirm = (item: CatalogItem, spell: CatalogSpell) => {
    setSelectedItem(item)
    setSearchQuery(item.name)
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
    setSelectedItem(item)
    setSearchQuery(item.name)
    setResistanceType(type)
    setShowResistanceDialog(false)
    setPendingResistanceItem(null)
  }

  const handleResistanceCancel = () => {
    setShowResistanceDialog(false)
    setPendingResistanceItem(null)
  }

  const handleSubmit = () => {
    if (!selectedItem) return

    // Extract price if available in properties
    let estimatedValueGp: number | undefined
    if (selectedItem.properties?.Prix) {
      const priceStr = String(selectedItem.properties.Prix)
      const match = priceStr.match(/(\d+)/)
      if (match) {
        estimatedValueGp = parseInt(match[1], 10)
      }
    }

    onAdd({
      name: selectedItem.name,
      description: selectedItem.description || undefined,
      itemType: mapCategoryToLootType(selectedItem.category, selectedItem.subcategory),
      rarity: mapRarityToLootRarity(selectedItem.rarity),
      quantity,
      isIdentified: true,
      estimatedValueGp,
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
        <DialogContent className="sm:max-w-md">
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
              {selectedItem && (
                <p className="text-xs text-green-500">
                  Objet sélectionné: {selectedItem.name}
                </p>
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
                  onClick={() => {
                    setLinkedSpell(null)
                    if (selectedItem && isScrollItem(selectedItem)) {
                      setPendingScrollItem(selectedItem)
                      setShowScrollDialog(true)
                    }
                  }}
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
                  onClick={() => {
                    setResistanceType(null)
                    if (selectedItem && isResistancePotion(selectedItem)) {
                      setPendingResistanceItem(selectedItem)
                      setShowResistanceDialog(true)
                    }
                  }}
                >
                  Modifier
                </Button>
              </div>
            )}

            {/* Quantity */}
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantité</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-24"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={!selectedItem}>
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
