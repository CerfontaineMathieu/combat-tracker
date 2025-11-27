"use client"

import { useState } from "react"
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
  Plus,
  Minus,
  X,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { CONDITIONS, CONDITION_COLORS, EXHAUSTION_LEVELS } from "@/lib/types"
import { ConditionList } from "@/components/condition-badge"

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

interface ConditionManagerProps {
  targetName: string
  currentConditions: string[]
  conditionDurations?: Record<string, number> // conditionId -> remaining turns
  exhaustionLevel: number
  onToggleCondition: (conditionId: string, duration?: number) => void
  onSetExhaustion: (level: number) => void
  trigger?: React.ReactNode
}

export function ConditionManager({
  targetName,
  currentConditions,
  conditionDurations = {},
  exhaustionLevel,
  onToggleCondition,
  onSetExhaustion,
  trigger,
}: ConditionManagerProps) {
  const [open, setOpen] = useState(false)
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)

  const hasCondition = (id: string) => currentConditions.includes(id)

  const handleConditionClick = (conditionId: string) => {
    if (hasCondition(conditionId)) {
      // Remove condition
      onToggleCondition(conditionId)
    } else {
      // Show duration selector
      setSelectedCondition(conditionId)
      setSelectedDuration(null)
    }
  }

  const handleAddWithDuration = () => {
    if (selectedCondition) {
      onToggleCondition(selectedCondition, selectedDuration ?? undefined)
      setSelectedCondition(null)
      setSelectedDuration(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="min-h-[36px] gap-1 text-xs"
          >
            <Plus className="w-3 h-3" />
            États
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-gold flex items-center gap-2">
            <Zap className="w-5 h-5" />
            États de {targetName}
          </DialogTitle>
        </DialogHeader>

        {/* Current conditions */}
        {(currentConditions.length > 0 || exhaustionLevel > 0) && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">États actifs:</p>
            <ConditionList
              conditions={currentConditions}
              conditionDurations={conditionDurations}
              exhaustionLevel={exhaustionLevel}
              onRemoveCondition={onToggleCondition}
              onRemoveExhaustion={() => onSetExhaustion(0)}
            />
          </div>
        )}

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {/* Duration selector popup */}
            {selectedCondition && (
              <div className="p-3 rounded-lg border border-gold/50 bg-gold/5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gold">
                    Ajouter: {CONDITIONS.find(c => c.id === selectedCondition)?.name}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedCondition(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Durée (tours):</p>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant={selectedDuration === null ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setSelectedDuration(null)}
                    >
                      Permanent
                    </Button>
                    {[1, 2, 3, 5, 10].map(d => (
                      <Button
                        key={d}
                        variant={selectedDuration === d ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedDuration(d)}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full bg-gold hover:bg-gold/80 text-background"
                  onClick={handleAddWithDuration}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter
                </Button>
              </div>
            )}

            {/* Conditions */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Conditions</h3>
              <div className="grid grid-cols-2 gap-2">
                {CONDITIONS.map(condition => {
                  const IconComponent = ICON_MAP[condition.icon]
                  const colors = CONDITION_COLORS[condition.color] || CONDITION_COLORS.gray
                  const isActive = hasCondition(condition.id)
                  const duration = conditionDurations[condition.id]

                  return (
                    <button
                      key={condition.id}
                      onClick={() => handleConditionClick(condition.id)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                        "hover:scale-[1.02] active:scale-[0.98]",
                        isActive
                          ? `${colors.bg} ${colors.border} ${colors.text}`
                          : "bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50",
                        selectedCondition === condition.id && "ring-2 ring-gold"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center shrink-0",
                        isActive ? colors.bg : "bg-muted"
                      )}>
                        {IconComponent && (
                          <IconComponent className={cn("w-4 h-4", isActive && colors.text)} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-sm font-medium truncate",
                          isActive && colors.text
                        )}>
                          {condition.name}
                        </p>
                        {isActive && duration && (
                          <p className="text-xs opacity-75">{duration} tour{duration > 1 ? 's' : ''}</p>
                        )}
                      </div>
                      {isActive && (
                        <X className={cn("w-4 h-4 shrink-0", colors.text)} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Exhaustion */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Battery className="w-4 h-4" />
                  Épuisement
                </h3>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onSetExhaustion(Math.max(0, exhaustionLevel - 1))}
                    disabled={exhaustionLevel === 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <div className={cn(
                    "w-10 h-8 flex items-center justify-center rounded-md font-bold text-lg",
                    exhaustionLevel === 0 && "bg-muted text-muted-foreground",
                    exhaustionLevel >= 1 && exhaustionLevel <= 2 && "bg-amber-500/20 text-amber-500",
                    exhaustionLevel >= 3 && exhaustionLevel <= 4 && "bg-orange-500/20 text-orange-500",
                    exhaustionLevel >= 5 && "bg-red-500/20 text-red-500"
                  )}>
                    {exhaustionLevel}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onSetExhaustion(Math.min(6, exhaustionLevel + 1))}
                    disabled={exhaustionLevel === 6}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Exhaustion levels reference */}
              <div className="space-y-1">
                {EXHAUSTION_LEVELS.map(({ level, effect }) => (
                  <div
                    key={level}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md text-xs transition-all",
                      level <= exhaustionLevel
                        ? level <= 2
                          ? "bg-amber-500/10 text-amber-500"
                          : level <= 4
                          ? "bg-orange-500/10 text-orange-500"
                          : "bg-red-500/10 text-red-500"
                        : "text-muted-foreground"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                      level <= exhaustionLevel
                        ? level <= 2
                          ? "bg-amber-500/20"
                          : level <= 4
                          ? "bg-orange-500/20"
                          : "bg-red-500/20"
                        : "bg-muted"
                    )}>
                      {level}
                    </span>
                    <span className="flex-1">{effect}</span>
                    {level <= exhaustionLevel && (
                      <Check className="w-3 h-3 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

interface QuickConditionPickerProps {
  currentConditions: string[]
  exhaustionLevel: number
  onToggleCondition: (conditionId: string) => void
  onSetExhaustion: (level: number) => void
}

export function QuickConditionPicker({
  currentConditions,
  exhaustionLevel,
  onToggleCondition,
  onSetExhaustion,
}: QuickConditionPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <ScrollArea className="max-h-[300px]">
          <div className="space-y-1">
            {CONDITIONS.map(condition => {
              const IconComponent = ICON_MAP[condition.icon]
              const colors = CONDITION_COLORS[condition.color] || CONDITION_COLORS.gray
              const isActive = currentConditions.includes(condition.id)

              return (
                <button
                  key={condition.id}
                  onClick={() => {
                    onToggleCondition(condition.id)
                  }}
                  className={cn(
                    "flex items-center gap-2 w-full p-1.5 rounded-md text-sm transition-all text-left",
                    isActive
                      ? `${colors.bg} ${colors.text}`
                      : "hover:bg-secondary/50 text-muted-foreground"
                  )}
                >
                  {IconComponent && <IconComponent className="w-4 h-4 shrink-0" />}
                  <span className="flex-1 truncate">{condition.name}</span>
                  {isActive && <X className="w-3 h-3 shrink-0" />}
                </button>
              )
            })}
          </div>
          <Separator className="my-2" />
          <div className="flex items-center justify-between p-1.5">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Battery className="w-4 h-4" />
              Épuisement
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onSetExhaustion(Math.max(0, exhaustionLevel - 1))}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className="w-4 text-center font-mono text-sm">{exhaustionLevel}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onSetExhaustion(Math.min(6, exhaustionLevel + 1))}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
