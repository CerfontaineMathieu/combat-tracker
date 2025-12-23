"use client"

import { useState } from "react"
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
  Plus,
  Minus,
  X,
  Wand2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { BUFFS, BUFF_COLORS, getBuffsByType, type ActiveBuff, type BuffType } from "@/lib/types"
import { BuffList } from "@/components/buff-badge"

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

interface BuffManagerProps {
  targetName: string
  currentBuffs: ActiveBuff[]
  onToggleBuff: (buffId: string, duration?: number | null) => void
  onAddCustomBuff: (name: string, effect: string, type: BuffType, duration?: number | null) => void
  onRemoveBuff: (buffId: string, customName?: string) => void
  trigger?: React.ReactNode
  externalOpen?: boolean
  onExternalOpenChange?: (open: boolean) => void
}

export function BuffManager({
  targetName,
  currentBuffs,
  onToggleBuff,
  onAddCustomBuff,
  onRemoveBuff,
  trigger,
  externalOpen,
  onExternalOpenChange,
}: BuffManagerProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  // Use external control if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = (value: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(value)
    } else {
      setInternalOpen(value)
    }
  }
  const [selectedBuff, setSelectedBuff] = useState<string | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)

  // Custom buff state
  const [customName, setCustomName] = useState("")
  const [customEffect, setCustomEffect] = useState("")
  const [customType, setCustomType] = useState<BuffType>("buff")
  const [customDuration, setCustomDuration] = useState<number | null>(null)

  const hasBuff = (id: string) => currentBuffs.some(b => b.buffId === id)

  const handleBuffClick = (buffId: string) => {
    if (hasBuff(buffId)) {
      // Remove buff
      onRemoveBuff(buffId)
    } else {
      // Show duration selector
      setSelectedBuff(buffId)
      setSelectedDuration(null)
    }
  }

  const handleAddWithDuration = () => {
    if (selectedBuff) {
      onToggleBuff(selectedBuff, selectedDuration)
      setSelectedBuff(null)
      setSelectedDuration(null)
    }
  }

  const handleAddCustomBuff = () => {
    if (customName.trim()) {
      onAddCustomBuff(customName.trim(), customEffect.trim(), customType, customDuration)
      // Reset form
      setCustomName("")
      setCustomEffect("")
      setCustomType("buff")
      setCustomDuration(null)
    }
  }

  const buffs = getBuffsByType("buff")
  const debuffs = getBuffsByType("debuff")

  const renderBuffGrid = (buffList: typeof BUFFS) => (
    <div className="grid grid-cols-2 gap-2">
      {buffList.map(buff => {
        const IconComponent = BUFF_ICON_MAP[buff.icon]
        const colors = BUFF_COLORS[buff.color] || BUFF_COLORS.gray
        const isActive = hasBuff(buff.id)
        const activeBuff = currentBuffs.find(b => b.buffId === buff.id)
        const duration = activeBuff?.remainingTurns

        return (
          <button
            key={buff.id}
            onClick={() => handleBuffClick(buff.id)}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
              "hover:scale-[1.02] active:scale-[0.98]",
              isActive
                ? `${colors.bg} ${colors.border} ${colors.text}`
                : "bg-secondary/30 border-border/50 text-muted-foreground hover:bg-secondary/50",
              selectedBuff === buff.id && "ring-2 ring-gold"
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
                {buff.name}
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
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="min-h-[36px] gap-1 text-xs"
          >
            <Wand2 className="w-3 h-3" />
            Buffs
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-emerald-400 flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            Buffs & Debuffs de {targetName}
          </DialogTitle>
        </DialogHeader>

        {/* Current buffs */}
        {currentBuffs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Effets actifs:</p>
            <BuffList
              buffs={currentBuffs}
              onRemoveBuff={(buffId) => {
                const buff = currentBuffs.find(b => b.buffId === buffId)
                onRemoveBuff(buffId, buff?.customName)
              }}
            />
          </div>
        )}

        <Tabs defaultValue="buffs" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buffs" className="text-emerald-400 data-[state=active]:text-emerald-400">
              Buffs
            </TabsTrigger>
            <TabsTrigger value="debuffs" className="text-purple-400 data-[state=active]:text-purple-400">
              Debuffs
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-gray-400 data-[state=active]:text-gray-400">
              Personnalise
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="max-h-[400px] mt-4">
            {/* Duration selector popup */}
            {selectedBuff && (
              <div className="p-3 mb-4 rounded-lg border border-gold/50 bg-gold/5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gold">
                    Ajouter: {BUFFS.find(b => b.id === selectedBuff)?.name}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setSelectedBuff(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Duree (tours):</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={selectedDuration === null ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setSelectedDuration(null)}
                    >
                      Permanent
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedDuration(Math.max(1, (selectedDuration || 1) - 1))}
                        disabled={selectedDuration === null}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={selectedDuration ?? ""}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "") {
                            setSelectedDuration(null)
                          } else {
                            const num = parseInt(value, 10)
                            if (!isNaN(num) && num >= 1) {
                              setSelectedDuration(num)
                            }
                          }
                        }}
                        onFocus={() => {
                          if (selectedDuration === null) {
                            setSelectedDuration(1)
                          }
                        }}
                        placeholder="inf"
                        className="h-8 w-16 text-center px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedDuration((selectedDuration || 0) + 1)}
                        disabled={selectedDuration === null}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
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

            <TabsContent value="buffs" className="mt-0 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Effets positifs (sorts de soutien, benedictions, etc.)
              </p>
              {renderBuffGrid(buffs)}
            </TabsContent>

            <TabsContent value="debuffs" className="mt-0 space-y-2">
              <p className="text-xs text-muted-foreground mb-2">
                Effets negatifs (maledictions, affaiblissements, etc.)
              </p>
              {renderBuffGrid(debuffs)}
            </TabsContent>

            <TabsContent value="custom" className="mt-0 space-y-4">
              <p className="text-xs text-muted-foreground">
                Creez un effet personnalise pour un sort ou une capacite specifique.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="custom-name">Nom de l'effet</Label>
                  <Input
                    id="custom-name"
                    placeholder="Ex: Aura de protection"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-effect">Description de l'effet</Label>
                  <Textarea
                    id="custom-effect"
                    placeholder="Ex: +2 CA pour les allies a 3m"
                    value={customEffect}
                    onChange={(e) => setCustomEffect(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type d'effet</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={customType === "buff" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "flex-1",
                        customType === "buff" && "bg-emerald-600 hover:bg-emerald-700"
                      )}
                      onClick={() => setCustomType("buff")}
                    >
                      <Sparkles className="w-4 h-4 mr-1" />
                      Buff
                    </Button>
                    <Button
                      variant={customType === "debuff" ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "flex-1",
                        customType === "debuff" && "bg-purple-600 hover:bg-purple-700"
                      )}
                      onClick={() => setCustomType("debuff")}
                    >
                      <Skull className="w-4 h-4 mr-1" />
                      Debuff
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Duree (tours)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={customDuration === null ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setCustomDuration(null)}
                    >
                      Permanent
                    </Button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCustomDuration(Math.max(1, (customDuration || 1) - 1))}
                        disabled={customDuration === null}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={customDuration ?? ""}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === "") {
                            setCustomDuration(null)
                          } else {
                            const num = parseInt(value, 10)
                            if (!isNaN(num) && num >= 1) {
                              setCustomDuration(num)
                            }
                          }
                        }}
                        onFocus={() => {
                          if (customDuration === null) {
                            setCustomDuration(1)
                          }
                        }}
                        placeholder="inf"
                        className="h-8 w-16 text-center px-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCustomDuration((customDuration || 0) + 1)}
                        disabled={customDuration === null}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <Button
                  className="w-full bg-gold hover:bg-gold/80 text-background"
                  onClick={handleAddCustomBuff}
                  disabled={!customName.trim()}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter l'effet personnalise
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
