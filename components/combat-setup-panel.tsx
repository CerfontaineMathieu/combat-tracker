"use client"

import { useState, useEffect } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Swords, Play, Users, Skull, ArrowDown, Dices, Save, FolderOpen, Trash2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useCombatDnd, CombatSortableContext } from "@/components/combat-dnd-context"
import { SortableParticipantCard } from "@/components/draggable-card"
import type { CombatParticipant } from "@/lib/types"

interface FightPreset {
  id: number
  campaign_id: number
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface FightPresetMonster {
  id: number
  preset_id: number
  participant_type: "player" | "monster"
  reference_id: string
  name: string
  hp: number
  max_hp: number
  ac: number
  initiative: number
  quantity: number
}

interface FightPresetWithMonsters extends FightPreset {
  monsters: FightPresetMonster[]
}

interface CombatSetupPanelProps {
  onStartCombat: () => void
  onRemoveFromCombat: (id: string) => void
  onClearCombat?: () => void
  onUpdateParticipantInitiative?: (id: string, initiative: number) => void
  onRandomizeInitiatives?: () => void
  onLoadPreset?: (participants: CombatParticipant[]) => void
  mode: "mj" | "joueur"
  campaignId?: number
  ownCharacterIds?: string[] // IDs of characters owned by the current player
}

export function CombatSetupPanel({
  onStartCombat,
  onRemoveFromCombat,
  onClearCombat,
  onUpdateParticipantInitiative,
  onRandomizeInitiatives,
  onLoadPreset,
  mode,
  campaignId,
  ownCharacterIds = [],
}: CombatSetupPanelProps) {
  const { combatParticipants, isOverCombatZone } = useCombatDnd()

  const { setNodeRef, isOver } = useDroppable({
    id: "combat-drop-zone",
  })

  // Save/Load state
  const [presets, setPresets] = useState<FightPreset[]>([])
  const [loadingPresets, setLoadingPresets] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadSheetOpen, setLoadSheetOpen] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [presetDescription, setPresetDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [loadingPreset, setLoadingPreset] = useState<number | null>(null)

  const playerCount = combatParticipants.filter(p => p.type === "player").length
  const monsterCount = combatParticipants.filter(p => p.type === "monster").length
  const totalXp = combatParticipants
    .filter(p => p.type === "monster")
    .reduce((sum, p) => sum + (p.xp || 0), 0)
  const canStartCombat = combatParticipants.length >= 2

  // Fetch presets when sheet opens
  useEffect(() => {
    if (loadSheetOpen && campaignId) {
      fetchPresets()
    }
  }, [loadSheetOpen, campaignId])

  const fetchPresets = async () => {
    if (!campaignId) return
    setLoadingPresets(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/fight-presets`)
      if (response.ok) {
        const data = await response.json()
        setPresets(data)
      }
    } catch (error) {
      console.error("Failed to fetch presets:", error)
      toast.error("Erreur lors du chargement des combats")
    } finally {
      setLoadingPresets(false)
    }
  }

  const handleSave = async () => {
    if (!presetName.trim() || !campaignId) {
      toast.error("Veuillez entrer un nom")
      return
    }

    if (combatParticipants.length === 0) {
      toast.error("Ajoutez des participants avant de sauvegarder")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/fight-presets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName.trim(),
          description: presetDescription.trim() || null,
          monsters: combatParticipants.map((p) => ({
            participant_type: p.type,
            reference_id: p.id,
            name: p.name,
            hp: p.currentHp,
            max_hp: p.maxHp,
            ac: 10, // Default AC
            initiative: p.initiative,
            quantity: 1,
          })),
        }),
      })

      if (response.ok) {
        toast.success("Combat sauvegardé!", {
          description: presetName,
        })
        setSaveDialogOpen(false)
        setPresetName("")
        setPresetDescription("")
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      console.error("Failed to save preset:", error)
      toast.error("Erreur lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async (presetId: number) => {
    if (!campaignId || !onLoadPreset) return
    setLoadingPreset(presetId)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/fight-presets/${presetId}`
      )
      if (response.ok) {
        const preset: FightPresetWithMonsters = await response.json()

        // Convert preset monsters to CombatParticipant format
        const participants: CombatParticipant[] = (preset.monsters || []).flatMap((pm) => {
          return Array.from({ length: pm.quantity }, (_, i) => ({
            id: `preset-${pm.id}-${i}`,
            name: pm.quantity > 1 ? `${pm.name} ${i + 1}` : pm.name,
            initiative: pm.initiative,
            currentHp: pm.hp,
            maxHp: pm.max_hp,
            conditions: [],
            exhaustionLevel: 0,
            type: pm.participant_type,
          }))
        })

        onLoadPreset(participants)
        setLoadSheetOpen(false)
        toast.success("Combat chargé!", {
          description: `${preset.name} - ${participants.length} participant(s)`,
        })
      } else {
        throw new Error("Failed to load")
      }
    } catch (error) {
      console.error("Failed to load preset:", error)
      toast.error("Erreur lors du chargement")
    } finally {
      setLoadingPreset(null)
    }
  }

  const handleDelete = async (presetId: number, presetName: string) => {
    if (!campaignId) return
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/fight-presets/${presetId}`,
        { method: "DELETE" }
      )

      if (response.ok) {
        setPresets((prev) => prev.filter((p) => p.id !== presetId))
        toast.success("Combat supprimé", { description: presetName })
      } else {
        throw new Error("Failed to delete")
      }
    } catch (error) {
      console.error("Failed to delete preset:", error)
      toast.error("Erreur lors de la suppression")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  return (
    <Card className="bg-card border-border h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gold">
            <Swords className="w-5 h-5" />
            Préparation du Combat
          </CardTitle>
          {combatParticipants.length > 0 && (
            <div className="flex gap-2">
              <Badge variant="outline" className="border-gold/30 text-gold">
                <Users className="w-3 h-3 mr-1" />
                {playerCount}
              </Badge>
              <Badge variant="outline" className="border-crimson/30 text-crimson">
                <Skull className="w-3 h-3 mr-1" />
                {monsterCount}
              </Badge>
              {mode === "mj" && totalXp > 0 && (
                <Badge variant="secondary" className="bg-gold/20 text-gold border-gold/30">
                  XP: {totalXp.toLocaleString()}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Combat Controls */}
        {mode === "mj" && (
          <div className="mb-4 shrink-0 space-y-2">
            {/* Save/Load Buttons */}
            {campaignId && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(true)}
                  disabled={combatParticipants.length === 0}
                  className="flex-1 min-h-[40px] border-gold/30 hover:border-gold hover:bg-gold/10 text-gold"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLoadSheetOpen(true)}
                  className="flex-1 min-h-[40px] border-primary/30 hover:border-primary hover:bg-primary/10"
                >
                  <FolderOpen className="w-4 h-4 mr-2" />
                  Charger
                </Button>
              </div>
            )}

            {/* Initiative Controls */}
            {combatParticipants.length > 0 && onRandomizeInitiatives && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={onRandomizeInitiatives}
                  className="flex-1 min-h-[40px] border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10 text-purple-500"
                >
                  <Dices className="w-4 h-4 mr-2" />
                  Randomiser les initiatives
                </Button>
                {onClearCombat && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-h-[40px] border-crimson/30 hover:border-crimson hover:bg-crimson/10 text-crimson"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-crimson">Vider le combat ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprimera tous les monstres et joueurs du combat.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-border">Annuler</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={onClearCombat}
                          className="bg-crimson hover:bg-crimson/80"
                        >
                          Vider
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}

            {/* Start Combat Button */}
            <Button
              onClick={onStartCombat}
              disabled={!canStartCombat}
              className={cn(
                "w-full min-h-[48px] active:scale-95 transition-smooth",
                canStartCombat
                  ? "bg-emerald hover:bg-emerald/80 text-background"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              <Play className="w-5 h-5 mr-2" />
              {canStartCombat
                ? `Commencer le combat (${combatParticipants.length} participants)`
                : "Ajoutez des participants pour commencer"}
            </Button>
          </div>
        )}

        {/* Drop Zone / Participant List */}
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 rounded-xl border-2 border-dashed transition-all overflow-hidden",
            combatParticipants.length === 0
              ? "flex items-center justify-center"
              : "",
            isOver || isOverCombatZone
              ? "border-gold bg-gold/10"
              : "border-border/50 hover:border-border"
          )}
        >
          {combatParticipants.length === 0 ? (
            <div className="text-center text-muted-foreground p-8 animate-fade-in">
              <div className={cn(
                "w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center transition-all",
                isOver || isOverCombatZone
                  ? "bg-gold/20"
                  : "bg-muted/30"
              )}>
                {isOver || isOverCombatZone ? (
                  <ArrowDown className="w-10 h-10 text-gold animate-bounce" />
                ) : (
                  <Swords className="w-10 h-10 opacity-30" />
                )}
              </div>
              <p className="text-lg font-medium">
                {isOver || isOverCombatZone
                  ? "Déposez ici!"
                  : "Zone de Combat"}
              </p>
              <p className="text-sm mt-1">
                {mode === "mj"
                  ? "Glissez les joueurs et monstres ici pour construire le combat"
                  : "En attente de la configuration du combat..."}
              </p>
              {mode === "mj" && (
                <p className="text-xs mt-3 text-muted-foreground/70">
                  Réorganisez l&apos;ordre d&apos;initiative en glissant les cartes
                </p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-full p-3">
              <CombatSortableContext>
                <div className="space-y-2">
                  {combatParticipants.map((participant, index) => (
                    <SortableParticipantCard
                      key={participant.id}
                      participant={participant}
                      index={index}
                      onRemove={() => onRemoveFromCombat(participant.id)}
                      onUpdateInitiative={
                        onUpdateParticipantInitiative
                          ? (initiative) => onUpdateParticipantInitiative(participant.id, initiative)
                          : undefined
                      }
                      mode={mode}
                      ownCharacterIds={ownCharacterIds}
                    />
                  ))}
                </div>
              </CombatSortableContext>

              {/* Drop hint when dragging */}
              {(isOver || isOverCombatZone) && (
                <div className="mt-2 p-4 rounded-lg border-2 border-dashed border-gold bg-gold/5 text-center animate-fade-in">
                  <ArrowDown className="w-5 h-5 mx-auto text-gold animate-bounce" />
                  <p className="text-sm text-gold mt-1">Déposez ici pour ajouter</p>
                </div>
              )}
            </ScrollArea>
          )}
        </div>

        {/* Helper Text */}
        {mode === "mj" && combatParticipants.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-3 shrink-0">
            Glissez pour réorganiser l&apos;ordre d&apos;initiative
          </p>
        )}
      </CardContent>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-gold">Sauvegarder le combat</DialogTitle>
            <DialogDescription>
              Sauvegardez cette configuration pour la réutiliser plus tard
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Nom du combat</Label>
              <Input
                id="preset-name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Ex: Embuscade gobeline, Boss final..."
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preset-desc">Description (optionnel)</Label>
              <Textarea
                id="preset-desc"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="Notes sur ce combat..."
                className="bg-background resize-none"
                rows={3}
              />
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                Participants à sauvegarder:
              </p>
              <div className="flex flex-wrap gap-1">
                {combatParticipants.map((p) => (
                  <Badge
                    key={p.id}
                    variant="outline"
                    className={cn(
                      "text-xs",
                      p.type === "player" ? "border-gold/30 text-gold" : "border-crimson/30 text-crimson"
                    )}
                  >
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !presetName.trim()}
              className="bg-gold hover:bg-gold/80 text-background"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1" />
              )}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Sheet */}
      <Sheet open={loadSheetOpen} onOpenChange={setLoadSheetOpen}>
        <SheetContent className="bg-card border-border w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-gold flex items-center gap-2">
              <Swords className="w-5 h-5" />
              Combats sauvegardés
            </SheetTitle>
            <SheetDescription>
              Sélectionnez un combat préparé pour le charger
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6">
            {loadingPresets ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun combat sauvegardé</p>
                <p className="text-sm mt-1">
                  Préparez un combat et sauvegardez-le
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-3 pr-4">
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-4 bg-secondary/50 rounded-lg border border-border/50 hover:border-border transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">
                            {preset.name}
                          </h3>
                          {preset.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {preset.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-crimson shrink-0"
                          onClick={() => handleDelete(preset.id, preset.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(preset.updated_at)}
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleLoad(preset.id)}
                          disabled={loadingPreset === preset.id}
                          className="min-h-[36px] bg-primary hover:bg-primary/80"
                        >
                          {loadingPreset === preset.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <FolderOpen className="w-4 h-4 mr-1" />
                              Charger
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  )
}
