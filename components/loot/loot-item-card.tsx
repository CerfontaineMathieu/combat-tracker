"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sword,
  Shield,
  FlaskConical,
  Scroll,
  Sparkles,
  Coins,
  Package,
  ThumbsUp,
  Flame,
  CheckCircle,
  Landmark,
  CircleDashed,
  ChevronDown,
  Dice6,
  MessageSquare,
  Undo2,
} from "lucide-react"
import type { LootItem, LootClaim, LootItemType, LootItemRarity } from "@/lib/types"
import { LOOT_RARITIES, LOOT_STATUSES, LOOT_ITEM_TYPES } from "@/lib/types"
import { getPriorityEmoji, getPriorityLabel } from "@/lib/loot-utils"
import { cn } from "@/lib/utils"

interface LootItemCardProps {
  item: LootItem
  isDM: boolean
  currentCharacterId?: string
  currentCharacterName?: string
  connectedCharacters?: Array<{ id: string; name: string }>
  onClaim?: (itemId: string, priority: 1 | 2 | 3, note?: string) => void
  onUnclaim?: (itemId: string) => void
  onAssign?: (itemId: string, characterId: string, characterName: string, quantity?: number) => void
  onUnassign?: (itemId: string) => void
  onSendToTreasury?: (itemId: string) => void
  onTriggerRollOff?: (itemId: string) => void
  onRequestSplit?: (item: LootItem, character: { id: string; name: string }) => void
}

const ITEM_ICONS: Record<LootItemType, React.ReactNode> = {
  weapon: <Sword className="w-4 h-4" />,
  armor: <Shield className="w-4 h-4" />,
  potion: <FlaskConical className="w-4 h-4" />,
  scroll: <Scroll className="w-4 h-4" />,
  wondrous: <Sparkles className="w-4 h-4" />,
  currency: <Coins className="w-4 h-4" />,
  misc: <Package className="w-4 h-4" />,
}

const STATUS_ICONS: Record<LootItem['status'], React.ReactNode> = {
  unclaimed: <CircleDashed className="w-4 h-4" />,
  contested: <Flame className="w-4 h-4" />,
  assigned: <CheckCircle className="w-4 h-4" />,
  treasury: <Landmark className="w-4 h-4" />,
  sold: <Coins className="w-4 h-4" />,
}

export function LootItemCard({
  item,
  isDM,
  currentCharacterId,
  currentCharacterName,
  connectedCharacters = [],
  onClaim,
  onUnclaim,
  onAssign,
  onUnassign,
  onSendToTreasury,
  onTriggerRollOff,
  onRequestSplit,
}: LootItemCardProps) {
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [claimNote, setClaimNote] = useState("")
  const [selectedPriority, setSelectedPriority] = useState<1 | 2 | 3>(1)

  const rarityStyle = LOOT_RARITIES[item.rarity]
  const statusInfo = LOOT_STATUSES[item.status]
  const itemTypeInfo = LOOT_ITEM_TYPES[item.itemType]

  // Check if current character has claimed this item
  const currentClaim = currentCharacterId
    ? item.claims.find((c) => c.characterId === currentCharacterId)
    : undefined

  const isResolved = item.status === 'assigned' || item.status === 'treasury' || item.status === 'sold'

  const handleClaim = (priority: 1 | 2 | 3) => {
    if (onClaim && currentCharacterId) {
      onClaim(item.id, priority, claimNote || undefined)
      setClaimNote("")
      setShowNoteInput(false)
    }
  }

  const handleUnclaim = () => {
    if (onUnclaim) {
      onUnclaim(item.id)
    }
  }

  return (
    <Card
      className={cn(
        "border transition-all",
        rarityStyle.borderColor,
        item.status === 'contested' && "ring-2 ring-orange-500/50",
        isResolved && "opacity-75"
      )}
      role="article"
      aria-label={`${item.name} - ${statusInfo.label}`}
    >
      <CardContent className="p-3">
        {/* Header: Item name + status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={cn("shrink-0", rarityStyle.color)}>
              {ITEM_ICONS[item.itemType]}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("font-medium truncate", rarityStyle.color)}>
                  {item.name}
                </span>
                {item.quantity > 1 && (
                  <Badge variant="outline" className="text-xs">
                    x{item.quantity}
                  </Badge>
                )}
              </div>
              {!item.isIdentified && (
                <span className="text-xs text-muted-foreground">Non identifié</span>
              )}
            </div>
          </div>

          {/* Status badge */}
          <Badge
            variant="outline"
            className={cn("shrink-0 text-xs", statusInfo.color)}
          >
            {STATUS_ICONS[item.status]}
            <span className="ml-1">{statusInfo.label}</span>
          </Badge>
        </div>

        {/* Rarity + Type info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Badge variant="secondary" className={cn("text-xs", rarityStyle.bgColor, rarityStyle.color)}>
            {rarityStyle.label}
          </Badge>
          <span>{itemTypeInfo.label}</span>
          {item.estimatedValueGp && (
            <span className="text-amber-400">~{item.estimatedValueGp} po</span>
          )}
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Claims section */}
        {item.claims.length > 0 && (
          <div className="mb-2 p-2 rounded bg-muted/50">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Réclamations ({item.claims.length}):
            </div>
            <div className="space-y-1">
              {item.claims.map((claim) => (
                <TooltipProvider key={claim.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "flex items-center gap-2 text-sm",
                        claim.characterId === currentCharacterId && "font-medium text-primary"
                      )}>
                        <span>{getPriorityEmoji(claim.priority)}</span>
                        <span>{claim.characterName}</span>
                        {claim.note && (
                          <MessageSquare className="w-3 h-3 text-muted-foreground" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <div className="font-medium">{getPriorityLabel(claim.priority)}</div>
                        {claim.note && <div className="text-muted-foreground">{claim.note}</div>}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
        )}

        {/* Assigned to */}
        {item.assignedTo && item.assignedToName && (
          <div className="mb-2 p-2 rounded bg-green-500/10 border border-green-500/30 flex items-center justify-between">
            <span className="text-sm text-green-400">
              Attribué à {item.assignedToName}
            </span>
            {isDM && onUnassign && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUnassign(item.id)}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-red-400"
                aria-label={`Retirer l'attribution de ${item.name}`}
              >
                <Undo2 className="w-3 h-3 mr-1" />
                Retirer
              </Button>
            )}
          </div>
        )}

        {/* Actions */}
        {!isResolved && (
          <div className="flex flex-wrap gap-2">
            {/* Player claiming UI */}
            {!isDM && currentCharacterId && (
              <>
                {currentClaim ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnclaim}
                    className="text-red-400 border-red-400/50"
                    aria-label={`Retirer ma réclamation pour ${item.name}`}
                  >
                    Retirer ma réclamation
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Réclamer ${item.name}`}
                      >
                        <ThumbsUp className="w-4 h-4 mr-1" aria-hidden="true" />
                        Réclamer
                        <ChevronDown className="w-3 h-3 ml-1" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleClaim(1)}>
                        👍 Intéressé
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleClaim(2)}>
                        👍👍 Très intéressé
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleClaim(3)}>
                        👍👍👍 BESOIN
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Note toggle */}
                {!currentClaim && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNoteInput(!showNoteInput)}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </Button>
                )}
              </>
            )}

            {/* DM controls */}
            {isDM && (
              <>
                {/* Assign dropdown */}
                {connectedCharacters.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="touch-target"
                        aria-label={`Attribuer ${item.name} à un personnage`}
                      >
                        <CheckCircle className="w-4 h-4 sm:mr-1" aria-hidden="true" />
                        <span className="hidden sm:inline">Attribuer</span>
                        <ChevronDown className="w-3 h-3 ml-1" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {connectedCharacters.map((char) => (
                        <DropdownMenuItem
                          key={char.id}
                          onClick={() => {
                            // If quantity > 1, open split dialog; otherwise assign directly
                            if (item.quantity > 1 && onRequestSplit) {
                              onRequestSplit(item, char)
                            } else {
                              onAssign?.(item.id, char.id, char.name)
                            }
                          }}
                        >
                          {char.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Roll-off button (only for contested items) */}
                {item.status === 'contested' && item.claims.length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onTriggerRollOff?.(item.id)}
                    className="text-orange-400 border-orange-400/50 touch-target"
                    aria-label={`Lancer un roll-off pour ${item.name}`}
                  >
                    <Dice6 className="w-4 h-4 sm:mr-1" aria-hidden="true" />
                    <span className="hidden sm:inline">Roll-off</span>
                  </Button>
                )}

                {/* Treasury button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSendToTreasury?.(item.id)}
                  className="text-amber-400 border-amber-400/50 touch-target"
                  aria-label={`Envoyer ${item.name} au trésor du groupe`}
                >
                  <Landmark className="w-4 h-4 sm:mr-1" aria-hidden="true" />
                  <span className="hidden sm:inline">Trésor</span>
                </Button>
              </>
            )}
          </div>
        )}

        {/* Note input (when claiming) */}
        {showNoteInput && !currentClaim && (
          <div className="mt-2">
            <Textarea
              placeholder="Pourquoi voulez-vous cet objet ? (optionnel)"
              value={claimNote}
              onChange={(e) => setClaimNote(e.target.value)}
              className="text-sm h-16"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
