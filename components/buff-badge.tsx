"use client"

import {
  Sparkles,
  Zap,
  Shield,
  ShieldPlus,
  HeartPulse,
  Heart,
  Shirt,
  TreeDeciduous,
  Sun,
  Maximize2,
  ShieldCheck,
  Wind,
  Music,
  Cloud,
  Snail,
  Skull,
  Minimize2,
  ZapOff,
  Crosshair,
  Sparkle,
  Lock,
  EyeOff,
  Crown,
  Target,
  CirclePlus,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { BUFF_COLORS, getBuffById, type ActiveBuff, type BuffType } from "@/lib/types"

// Map icon names to Lucide components
const BUFF_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "sparkles": Sparkles,
  "zap": Zap,
  "shield": Shield,
  "shield-plus": ShieldPlus,
  "heart-pulse": HeartPulse,
  "heart": Heart,
  "shirt": Shirt,
  "tree-deciduous": TreeDeciduous,
  "sun": Sun,
  "maximize-2": Maximize2,
  "shield-check": ShieldCheck,
  "wind": Wind,
  "music": Music,
  "cloud": Cloud,
  "snail": Snail,
  "skull": Skull,
  "minimize-2": Minimize2,
  "zap-off": ZapOff,
  "crosshair": Crosshair,
  "sparkle": Sparkle,
  "lock": Lock,
  "eye-off": EyeOff,
  "crown": Crown,
  "target": Target,
  "plus-circle": CirclePlus,
}

interface BuffBadgeProps {
  buffId: string
  showLabel?: boolean
  size?: "sm" | "md"
  remainingTurns?: number | null
  customName?: string
  customEffect?: string
  customType?: BuffType
  onRemove?: () => void
}

export function BuffBadge({
  buffId,
  showLabel = true,
  size = "sm",
  remainingTurns,
  customName,
  customEffect,
  customType,
  onRemove
}: BuffBadgeProps) {
  const buff = getBuffById(buffId)

  // Handle custom buffs
  const isCustom = buffId === "custom" || customName !== undefined
  const displayName = customName || buff?.name || "Effet"
  const displayEffect = customEffect || buff?.effect || ""
  const displayType = customType || buff?.type || "buff"
  const displayIcon = buff?.icon || "plus-circle"
  const displayColor = buff?.color || (displayType === "buff" ? "emerald" : "purple")

  const IconComponent = BUFF_ICON_MAP[displayIcon]
  const colors = BUFF_COLORS[displayColor] || BUFF_COLORS.gray

  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4"
  const badgeSize = size === "sm" ? "text-xs py-0.5 px-1.5" : "text-sm py-1 px-2"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              badgeSize,
              colors.bg,
              colors.border,
              colors.text,
              "gap-1 cursor-default transition-all",
              onRemove && "cursor-pointer hover:opacity-80"
            )}
            onClick={onRemove}
          >
            {IconComponent && <IconComponent className={iconSize} />}
            {showLabel && <span>{displayName}</span>}
            {remainingTurns !== undefined && remainingTurns !== null && (
              <span className="ml-0.5 opacity-75 font-mono text-[10px]">({remainingTurns})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{displayName}</p>
            <span className={cn(
              "text-[10px] px-1.5 py-0.5 rounded",
              displayType === "buff" ? "bg-emerald-500/20 text-emerald-400" : "bg-purple-500/20 text-purple-400"
            )}>
              {displayType === "buff" ? "Buff" : "Debuff"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{displayEffect}</p>
          {remainingTurns !== undefined && remainingTurns !== null && (
            <p className="text-xs mt-1 text-amber-400">Expire dans {remainingTurns} tour{remainingTurns > 1 ? 's' : ''}</p>
          )}
          {isCustom && (
            <p className="text-xs mt-1 text-gray-500 italic">Effet personnalise</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface BuffListProps {
  buffs: ActiveBuff[]
  showLabels?: boolean
  size?: "sm" | "md"
  onRemoveBuff?: (buffId: string) => void
}

export function BuffList({
  buffs,
  showLabels = true,
  size = "sm",
  onRemoveBuff,
}: BuffListProps) {
  if (!buffs || buffs.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {buffs.map((activeBuff, index) => (
        <BuffBadge
          key={`${activeBuff.buffId}-${index}`}
          buffId={activeBuff.buffId}
          showLabel={showLabels}
          size={size}
          remainingTurns={activeBuff.remainingTurns}
          customName={activeBuff.customName}
          customEffect={activeBuff.customEffect}
          customType={activeBuff.customType}
          onRemove={onRemoveBuff ? () => onRemoveBuff(activeBuff.buffId) : undefined}
        />
      ))}
    </div>
  )
}
