"use client"

import { useRef, useEffect } from "react"
import { ScrollText, Swords, Heart, Skull, Zap, Play, Square, SkipForward, UserPlus, UserMinus } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface HistoryEntry {
  id: string
  timestamp: Date
  type: "combat_start" | "combat_end" | "turn" | "damage" | "heal" | "condition_add" | "condition_remove" | "participant_add" | "participant_remove" | "death"
  actor?: string
  target?: string
  value?: number
  details?: string
}

interface CombatHistoryPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  history: HistoryEntry[]
}

export function CombatHistoryPanel({ open, onOpenChange, history }: CombatHistoryPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history.length])

  const getIcon = (type: HistoryEntry["type"]) => {
    switch (type) {
      case "combat_start":
        return <Play className="w-4 h-4 text-emerald" />
      case "combat_end":
        return <Square className="w-4 h-4 text-crimson" />
      case "turn":
        return <SkipForward className="w-4 h-4 text-gold" />
      case "damage":
        return <Swords className="w-4 h-4 text-crimson" />
      case "heal":
        return <Heart className="w-4 h-4 text-emerald" />
      case "condition_add":
      case "condition_remove":
        return <Zap className="w-4 h-4 text-purple-500" />
      case "participant_add":
        return <UserPlus className="w-4 h-4 text-gold" />
      case "participant_remove":
        return <UserMinus className="w-4 h-4 text-muted-foreground" />
      case "death":
        return <Skull className="w-4 h-4 text-crimson" />
      default:
        return <ScrollText className="w-4 h-4" />
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const getMessage = (entry: HistoryEntry) => {
    switch (entry.type) {
      case "combat_start":
        return "Combat commencé"
      case "combat_end":
        return "Combat terminé"
      case "turn":
        return `Tour de ${entry.target}`
      case "damage":
        return (
          <span>
            <span className="font-semibold text-crimson">{entry.target}</span> reçoit{" "}
            <span className="font-bold text-crimson">{entry.value}</span> dégâts
            {entry.actor && <span className="text-muted-foreground"> de {entry.actor}</span>}
          </span>
        )
      case "heal":
        return (
          <span>
            <span className="font-semibold text-emerald">{entry.target}</span> récupère{" "}
            <span className="font-bold text-emerald">{entry.value}</span> PV
          </span>
        )
      case "condition_add":
        return (
          <span>
            <span className="font-semibold">{entry.target}</span> est{" "}
            <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-500 mx-1">
              {entry.details}
            </Badge>
          </span>
        )
      case "condition_remove":
        return (
          <span>
            <span className="font-semibold">{entry.target}</span> n&apos;est plus{" "}
            <span className="text-muted-foreground">{entry.details}</span>
          </span>
        )
      case "participant_add":
        return (
          <span>
            <span className="font-semibold text-gold">{entry.target}</span> rejoint le combat
          </span>
        )
      case "participant_remove":
        return (
          <span>
            <span className="text-muted-foreground">{entry.target}</span> quitte le combat
          </span>
        )
      case "death":
        return (
          <span>
            <span className="font-semibold text-crimson">{entry.target}</span> est mort
          </span>
        )
      default:
        return entry.details || "Action"
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-card border-border w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-gold flex items-center gap-2">
            <ScrollText className="w-5 h-5" />
            Historique du Combat
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 h-[calc(100vh-120px)]">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <ScrollText className="w-12 h-12 opacity-30 mb-3" />
              <p>Aucune action enregistrée</p>
              <p className="text-sm mt-1">L&apos;historique apparaîtra ici</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4" ref={scrollRef}>
              <div className="space-y-2">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-lg transition-colors",
                      entry.type === "combat_start" && "bg-emerald/10 border border-emerald/20",
                      entry.type === "combat_end" && "bg-crimson/10 border border-crimson/20",
                      entry.type === "turn" && "bg-gold/10 border border-gold/20",
                      entry.type === "death" && "bg-crimson/10 border border-crimson/20",
                      !["combat_start", "combat_end", "turn", "death"].includes(entry.type) && "bg-secondary/30"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getIcon(entry.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{getMessage(entry)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatTime(entry.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
