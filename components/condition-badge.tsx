"use client"

import {
  ArrowDown,
  Grab,
  EarOff,
  EyeOff,
  Heart,
  Ghost,
  Skull,
  Link,
  Zap,
  Ban,
  Moon,
  Eye,
  Pause,
  Mountain,
  Focus,
  Battery,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { CONDITIONS, CONDITION_COLORS, EXHAUSTION_LEVELS, getConditionById } from "@/lib/types"

// Map icon names to Lucide components
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "arrow-down": ArrowDown,
  "grab": Grab,
  "ear-off": EarOff,
  "eye-off": EyeOff,
  "heart": Heart,
  "ghost": Ghost,
  "skull": Skull,
  "link": Link,
  "zap": Zap,
  "ban": Ban,
  "moon": Moon,
  "eye": Eye,
  "pause": Pause,
  "mountain": Mountain,
  "focus": Focus,
}

interface ConditionBadgeProps {
  conditionId: string
  showLabel?: boolean
  size?: "sm" | "md"
  remainingRounds?: number
  onRemove?: () => void
}

export function ConditionBadge({ conditionId, showLabel = true, size = "sm", remainingRounds, onRemove }: ConditionBadgeProps) {
  const condition = getConditionById(conditionId)

  if (!condition) return null

  const IconComponent = ICON_MAP[condition.icon]
  const colors = CONDITION_COLORS[condition.color] || CONDITION_COLORS.gray

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
            {showLabel && <span>{condition.name}</span>}
            {remainingRounds !== undefined && (
              <span className="ml-0.5 opacity-75 font-mono text-[10px]">({remainingRounds})</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-semibold">{condition.name}</p>
          <p className="text-xs text-muted-foreground">{condition.description}</p>
          {remainingRounds !== undefined && (
            <p className="text-xs mt-1 text-gold">Expire dans {remainingRounds} tour{remainingRounds > 1 ? 's' : ''}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface ExhaustionBadgeProps {
  level: number
  size?: "sm" | "md"
  onRemove?: () => void
}

export function ExhaustionBadge({ level, size = "sm", onRemove }: ExhaustionBadgeProps) {
  if (level < 1 || level > 6) return null

  const exhaustionInfo = EXHAUSTION_LEVELS.find(e => e.level === level)

  // Color gets more intense with higher levels
  const levelColors: Record<number, { bg: string; border: string; text: string }> = {
    1: { bg: "bg-amber-500/20", border: "border-amber-500/50", text: "text-amber-500" },
    2: { bg: "bg-orange-500/20", border: "border-orange-500/50", text: "text-orange-500" },
    3: { bg: "bg-orange-600/20", border: "border-orange-600/50", text: "text-orange-600" },
    4: { bg: "bg-red-500/20", border: "border-red-500/50", text: "text-red-500" },
    5: { bg: "bg-red-600/20", border: "border-red-600/50", text: "text-red-600" },
    6: { bg: "bg-red-700/30", border: "border-red-700/50", text: "text-red-700" },
  }

  const colors = levelColors[level]
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
            <Battery className={iconSize} />
            <span>Épuisement {level}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-semibold">Épuisement niveau {level}</p>
          <p className="text-xs text-muted-foreground">{exhaustionInfo?.effect}</p>
          {level < 6 && (
            <div className="mt-2 pt-2 border-t border-border">
              <p className="text-xs font-medium">Effets cumulés:</p>
              <ul className="text-xs text-muted-foreground list-disc pl-3 mt-1">
                {EXHAUSTION_LEVELS.slice(0, level).map(e => (
                  <li key={e.level}>{e.effect}</li>
                ))}
              </ul>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface ConditionListProps {
  conditions: string[]
  conditionDurations?: Record<string, number>
  exhaustionLevel?: number
  showLabels?: boolean
  size?: "sm" | "md"
  onRemoveCondition?: (conditionId: string) => void
  onRemoveExhaustion?: () => void
}

export function ConditionList({
  conditions,
  conditionDurations = {},
  exhaustionLevel = 0,
  showLabels = true,
  size = "sm",
  onRemoveCondition,
  onRemoveExhaustion,
}: ConditionListProps) {
  if (conditions.length === 0 && exhaustionLevel === 0) return null

  return (
    <div className="flex flex-wrap gap-1">
      {conditions.map(conditionId => (
        <ConditionBadge
          key={conditionId}
          conditionId={conditionId}
          showLabel={showLabels}
          size={size}
          remainingRounds={conditionDurations[conditionId]}
          onRemove={onRemoveCondition ? () => onRemoveCondition(conditionId) : undefined}
        />
      ))}
      {exhaustionLevel > 0 && (
        <ExhaustionBadge
          level={exhaustionLevel}
          size={size}
          onRemove={onRemoveExhaustion}
        />
      )}
    </div>
  )
}
