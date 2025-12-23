"use client"

import { useState, useEffect } from "react"
import { Dices, Users, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { SAVING_THROW_TYPES, type SavingThrowType, type CombatParticipant } from "@/lib/types"

interface GroupSaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participants: CombatParticipant[]
  onInitiate: (data: {
    saveType: SavingThrowType
    dc: number
    participants: Array<{
      participantId: string
      participantType: 'player' | 'monster'
      participantName: string
    }>
  }) => void
}

export function GroupSaveDialog({
  open,
  onOpenChange,
  participants,
  onInitiate,
}: GroupSaveDialogProps) {
  const [saveType, setSaveType] = useState<SavingThrowType>("DEX")
  const [dc, setDc] = useState("10")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSaveType("DEX")
      setDc("10")
      setSelectedIds(new Set())
    }
  }, [open])

  const players = participants.filter(p => p.type === "player")
  const monsters = participants.filter(p => p.type === "monster")

  const toggleParticipant = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  const selectAllPlayers = () => {
    const newSet = new Set(selectedIds)
    players.forEach(p => newSet.add(p.id))
    setSelectedIds(newSet)
  }

  const selectAll = () => {
    setSelectedIds(new Set(participants.map(p => p.id)))
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handleInitiate = () => {
    const dcNum = parseInt(dc)
    if (isNaN(dcNum) || selectedIds.size === 0) return

    const selectedParticipants = participants
      .filter(p => selectedIds.has(p.id))
      .map(p => ({
        participantId: p.id,
        participantType: p.type as 'player' | 'monster',
        participantName: p.name,
      }))

    onInitiate({
      saveType,
      dc: dcNum,
      participants: selectedParticipants,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <Dices className="w-5 h-5" />
            Jet de Sauvegarde Groupé
          </DialogTitle>
          <DialogDescription>
            Demander un jet de sauvegarde à plusieurs participants
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Save type selection */}
          <div className="space-y-2">
            <Label>Type de sauvegarde</Label>
            <Select value={saveType} onValueChange={(v) => setSaveType(v as SavingThrowType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SAVING_THROW_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label} ({value.abbr})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DC input */}
          <div className="space-y-2">
            <Label htmlFor="dc">Difficulté (DD)</Label>
            <Input
              id="dc"
              type="number"
              min={1}
              max={30}
              value={dc}
              onChange={(e) => setDc(e.target.value)}
              className="w-24"
            />
          </div>

          {/* Quick select buttons */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAllPlayers}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-1" />
              Tous les joueurs
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="flex-1"
            >
              <Check className="w-4 h-4 mr-1" />
              Tous
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
            >
              Effacer
            </Button>
          </div>

          {/* Participant selection */}
          <div className="space-y-2">
            <Label>Participants ({selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""})</Label>
            <ScrollArea className="h-[200px] border rounded-md p-2">
              {/* Players section */}
              {players.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-2 font-medium">Joueurs</div>
                  <div className="space-y-1">
                    {players.map((p) => (
                      <label
                        key={p.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent",
                          selectedIds.has(p.id) && "bg-emerald/10"
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => toggleParticipant(p.id)}
                        />
                        <span className="flex-1">{p.name}</span>
                        {p.level && (
                          <Badge variant="outline" className="text-xs">
                            Niv. {p.level}
                          </Badge>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Monsters section */}
              {monsters.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-2 font-medium">Monstres</div>
                  <div className="space-y-1">
                    {monsters.map((p) => (
                      <label
                        key={p.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent",
                          selectedIds.has(p.id) && "bg-crimson/10"
                        )}
                      >
                        <Checkbox
                          checked={selectedIds.has(p.id)}
                          onCheckedChange={() => toggleParticipant(p.id)}
                        />
                        <span className="flex-1">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {participants.length === 0 && (
                <div className="text-center text-muted-foreground py-4">
                  Aucun participant dans le combat
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleInitiate}
            disabled={selectedIds.size === 0 || !dc || isNaN(parseInt(dc))}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Dices className="w-4 h-4 mr-2" />
            Lancer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
