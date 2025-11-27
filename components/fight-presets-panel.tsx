"use client"

import { useState, useEffect } from "react"
import { Save, FolderOpen, Trash2, Plus, Loader2, Swords, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Monster } from "@/lib/types"

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
  monster_id: number | null
  name: string
  hp: number
  max_hp: number
  ac: number
  initiative: number
  notes: string | null
  quantity: number
}

interface FightPresetWithMonsters extends FightPreset {
  monsters: FightPresetMonster[]
}

interface FightPresetsPanelProps {
  campaignId: number
  currentMonsters: Monster[]
  onLoadPreset: (monsters: Monster[]) => void
}

export function FightPresetsPanel({
  campaignId,
  currentMonsters,
  onLoadPreset,
}: FightPresetsPanelProps) {
  const [presets, setPresets] = useState<FightPreset[]>([])
  const [loading, setLoading] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadSheetOpen, setLoadSheetOpen] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [presetDescription, setPresetDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [loadingPreset, setLoadingPreset] = useState<number | null>(null)

  // Fetch presets when sheet opens
  useEffect(() => {
    if (loadSheetOpen) {
      fetchPresets()
    }
  }, [loadSheetOpen])

  const fetchPresets = async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!presetName.trim()) {
      toast.error("Veuillez entrer un nom")
      return
    }

    if (currentMonsters.length === 0) {
      toast.error("Ajoutez des monstres avant de sauvegarder")
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
          monsters: currentMonsters.map((m) => ({
            monster_id: m.id.startsWith("m-") ? parseInt(m.id.replace("m-", ""), 10) : null,
            name: m.name,
            hp: m.hp,
            max_hp: m.maxHp,
            ac: m.ac,
            initiative: m.initiative,
            notes: m.notes || null,
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
    setLoadingPreset(presetId)
    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/fight-presets/${presetId}`
      )
      if (response.ok) {
        const preset: FightPresetWithMonsters = await response.json()

        // Convert preset monsters to Monster format
        const monsters: Monster[] = preset.monsters.flatMap((pm, index) => {
          // Handle quantity - create multiple instances if needed
          return Array.from({ length: pm.quantity }, (_, i) => ({
            id: `preset-${presetId}-${pm.id}-${i}`,
            name: pm.quantity > 1 ? `${pm.name} ${i + 1}` : pm.name,
            hp: pm.hp,
            maxHp: pm.max_hp,
            ac: pm.ac,
            initiative: pm.initiative,
            notes: pm.notes || "",
            status: "actif" as const,
          }))
        })

        onLoadPreset(monsters)
        setLoadSheetOpen(false)
        toast.success("Combat chargé!", {
          description: `${preset.name} - ${monsters.length} monstre(s)`,
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
    <div className="flex gap-2">
      {/* Save Button & Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[40px] border-gold/30 hover:border-gold hover:bg-gold/10 text-gold"
            disabled={currentMonsters.length === 0}
          >
            <Save className="w-4 h-4 mr-1" />
            Sauvegarder
          </Button>
        </DialogTrigger>
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
                Monstres à sauvegarder:
              </p>
              <div className="flex flex-wrap gap-1">
                {currentMonsters.map((m) => (
                  <Badge key={m.id} variant="outline" className="text-xs">
                    {m.name}
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

      {/* Load Button & Sheet */}
      <Sheet open={loadSheetOpen} onOpenChange={setLoadSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-h-[40px] border-primary/30 hover:border-primary hover:bg-primary/10"
          >
            <FolderOpen className="w-4 h-4 mr-1" />
            Charger
          </Button>
        </SheetTrigger>
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
            {loading ? (
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
                              <Plus className="w-4 h-4 mr-1" />
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
    </div>
  )
}
