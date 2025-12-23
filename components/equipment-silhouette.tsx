"use client"

import { cn } from "@/lib/utils"
import { EquipmentItem, EquipmentSlot, SLOT_NAMES } from "@/lib/types"
import { Shield, Sword, Gem, Shirt, CircleDot, Hand, Footprints } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Slot icons
const SLOT_ICONS: Record<EquipmentSlot, React.ComponentType<{ className?: string }>> = {
  'armor': Shirt,
  'shield': Shield,
  'main-hand': Sword,
  'off-hand': Sword,
  'ring-1': CircleDot,
  'ring-2': CircleDot,
  'amulet': Gem,
  'gloves': Hand,
  'boots': Footprints,
}

// Rarity colors for equipped items
const RARITY_COLORS: Record<string, string> = {
  'Commun': 'text-gray-400 border-gray-500',
  'Peu commun': 'text-green-400 border-green-500',
  'Rare': 'text-blue-400 border-blue-500',
  'Très rare': 'text-purple-400 border-purple-500',
  'Légendaire': 'text-orange-400 border-orange-500',
  'Artefact': 'text-red-400 border-red-500',
}

interface EquipmentSlotButtonProps {
  slot: EquipmentSlot
  item?: EquipmentItem
  onClick: (slot: EquipmentSlot) => void
  disabled?: boolean
}

function EquipmentSlotButton({ slot, item, onClick, disabled }: EquipmentSlotButtonProps) {
  const Icon = SLOT_ICONS[slot]
  const rarityClass = item?.rarity ? RARITY_COLORS[item.rarity] : ''

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onClick(slot)}
            disabled={disabled}
            className={cn(
              "w-16 h-16 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all",
              "hover:bg-accent/50 hover:border-solid focus:outline-none focus:ring-2 focus:ring-ring",
              disabled && "opacity-50 cursor-not-allowed",
              item ? [
                "border-solid bg-secondary/50",
                rarityClass || "border-muted-foreground"
              ] : "border-muted-foreground/50 bg-background/50"
            )}
          >
            <Icon className={cn(
              "w-6 h-6",
              item ? (rarityClass?.split(' ')[0] || "text-foreground") : "text-muted-foreground"
            )} />
            <span className={cn(
              "text-[10px] leading-tight text-center px-1 truncate w-full",
              item ? "text-foreground" : "text-muted-foreground"
            )}>
              {item ? item.name : SLOT_NAMES[slot]}
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <p className="font-semibold">{SLOT_NAMES[slot]}</p>
          {item ? (
            <>
              <p className="text-sm">{item.name}</p>
              {item.rarity && <p className="text-xs text-muted-foreground">{item.rarity}</p>}
              {item.description && <p className="text-xs mt-1">{item.description}</p>}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Cliquez pour équiper</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface EquipmentSilhouetteProps {
  equipment: EquipmentItem[]
  onSlotClick: (slot: EquipmentSlot) => void
  disabled?: boolean
}

export function EquipmentSilhouette({ equipment, onSlotClick, disabled }: EquipmentSilhouetteProps) {
  // Get item equipped in a specific slot
  const getEquippedItem = (slot: EquipmentSlot): EquipmentItem | undefined => {
    return equipment.find(item => item.slot === slot)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {/* Top row: Amulet */}
      <div className="flex justify-center">
        <EquipmentSlotButton
          slot="amulet"
          item={getEquippedItem('amulet')}
          onClick={onSlotClick}
          disabled={disabled}
        />
      </div>

      {/* Silhouette with rings and weapons */}
      <div className="relative">
        {/* Character silhouette (decorative) */}
        <div className="w-32 h-48 bg-gradient-to-b from-muted/30 to-muted/10 rounded-full mx-8 flex items-center justify-center">
          <svg viewBox="0 0 64 96" className="w-20 h-32 text-muted-foreground/30">
            {/* Simple human silhouette */}
            <circle cx="32" cy="12" r="10" fill="currentColor" /> {/* Head */}
            <path d="M32 22 L32 55 M20 32 L44 32 M32 55 L20 85 M32 55 L44 85"
                  stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" /> {/* Body */}
          </svg>
        </div>

        {/* Left side: Ring 1 + Main Hand */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 flex flex-col gap-2">
          <EquipmentSlotButton
            slot="ring-1"
            item={getEquippedItem('ring-1')}
            onClick={onSlotClick}
            disabled={disabled}
          />
          <EquipmentSlotButton
            slot="main-hand"
            item={getEquippedItem('main-hand')}
            onClick={onSlotClick}
            disabled={disabled}
          />
        </div>

        {/* Right side: Ring 2 + Off Hand */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 flex flex-col gap-2">
          <EquipmentSlotButton
            slot="ring-2"
            item={getEquippedItem('ring-2')}
            onClick={onSlotClick}
            disabled={disabled}
          />
          <EquipmentSlotButton
            slot="off-hand"
            item={getEquippedItem('off-hand')}
            onClick={onSlotClick}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Middle row: Armor + Shield + Gloves */}
      <div className="flex gap-4 justify-center">
        <EquipmentSlotButton
          slot="armor"
          item={getEquippedItem('armor')}
          onClick={onSlotClick}
          disabled={disabled}
        />
        <EquipmentSlotButton
          slot="shield"
          item={getEquippedItem('shield')}
          onClick={onSlotClick}
          disabled={disabled}
        />
        <EquipmentSlotButton
          slot="gloves"
          item={getEquippedItem('gloves')}
          onClick={onSlotClick}
          disabled={disabled}
        />
      </div>

      {/* Bottom row: Boots */}
      <div className="flex justify-center">
        <EquipmentSlotButton
          slot="boots"
          item={getEquippedItem('boots')}
          onClick={onSlotClick}
          disabled={disabled}
        />
      </div>
    </div>
  )
}
