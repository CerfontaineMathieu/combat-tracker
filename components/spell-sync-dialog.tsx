"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react"
import type { SpellSyncPreview, CatalogSpell, CatalogSpellInput } from "@/lib/types"
import { getSpellChangesSummary, getSpellLevelLabel } from "@/lib/spell-comparison"

interface SpellSyncDialogProps {
  trigger?: React.ReactNode
  onSyncComplete?: () => void
}

type SyncState = "idle" | "loading-preview" | "preview" | "applying" | "complete" | "error"

export function SpellSyncDialog({
  trigger,
  onSyncComplete,
}: SpellSyncDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<SyncState>("idle")
  const [preview, setPreview] = useState<SpellSyncPreview | null>(null)
  const [summary, setSummary] = useState<{
    toAdd: number
    toUpdate: number
    toDelete: number
    unchanged: number
    total: number
  } | null>(null)
  const [result, setResult] = useState<{
    added: number
    updated: number
    deleted: number
    errors: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPreview = async () => {
    setState("loading-preview")
    setError(null)

    try {
      const response = await fetch("/api/notion/spells/sync/preview", {
        method: "POST",
      })
      const data = await response.json()

      if (data.success) {
        setPreview(data.preview)
        setSummary(data.summary)
        setState("preview")
      } else {
        setError(data.error || "Erreur lors du chargement")
        setState("error")
      }
    } catch (err) {
      setError("Erreur de connexion")
      setState("error")
    }
  }

  const applySync = async () => {
    setState("applying")
    setError(null)

    try {
      const response = await fetch("/api/notion/spells/sync/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyAll: true }),
      })
      const data = await response.json()

      if (data.success) {
        setResult({
          added: data.added,
          updated: data.updated,
          deleted: data.deleted,
          errors: data.errors || [],
        })
        setState("complete")
        onSyncComplete?.()
      } else {
        setError(data.error || "Erreur lors de la synchronisation")
        setState("error")
      }
    } catch (err) {
      setError("Erreur de connexion")
      setState("error")
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      // Reset state when closing
      setState("idle")
      setPreview(null)
      setSummary(null)
      setResult(null)
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync Sorts
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-400">
            <Sparkles className="w-5 h-5" />
            Synchronisation des Sorts
          </DialogTitle>
          <DialogDescription>
            Synchronisez les sorts depuis votre base Notion
          </DialogDescription>
        </DialogHeader>

        {/* Idle state - show preview button */}
        {state === "idle" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <Sparkles className="w-12 h-12 text-purple-400 opacity-50" />
            <p className="text-muted-foreground text-center">
              Cliquez sur le bouton ci-dessous pour voir les modifications
              disponibles
            </p>
            <Button onClick={loadPreview} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Charger l'apercu
            </Button>
          </div>
        )}

        {/* Loading preview */}
        {state === "loading-preview" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-muted-foreground">
              Chargement des sorts depuis Notion...
            </p>
          </div>
        )}

        {/* Preview state */}
        {state === "preview" && preview && summary && (
          <>
            {/* Summary badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1">
                <Plus className="w-3 h-3 text-green-500" />
                {summary.toAdd} a ajouter
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Edit className="w-3 h-3 text-amber-500" />
                {summary.toUpdate} a mettre a jour
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Trash2 className="w-3 h-3 text-red-500" />
                {summary.toDelete} a supprimer
              </Badge>
              <Badge variant="secondary">{summary.unchanged} inchanges</Badge>
            </div>

            {/* Tabs for different categories */}
            <Tabs defaultValue="add" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="add" className="gap-1">
                  <Plus className="w-3 h-3" />
                  Ajouter ({summary.toAdd})
                </TabsTrigger>
                <TabsTrigger value="update" className="gap-1">
                  <Edit className="w-3 h-3" />
                  Modifier ({summary.toUpdate})
                </TabsTrigger>
                <TabsTrigger value="delete" className="gap-1">
                  <Trash2 className="w-3 h-3" />
                  Supprimer ({summary.toDelete})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="add" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[250px]">
                  {preview.toAdd.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Aucun sort a ajouter
                    </p>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {preview.toAdd.map((spell) => (
                        <SpellPreviewCard
                          key={spell.notion_id}
                          spell={spell}
                          action="add"
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="update" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[250px]">
                  {preview.toUpdate.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Aucun sort a mettre a jour
                    </p>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {preview.toUpdate.map((item) => (
                        <SpellPreviewCard
                          key={item.existing.notion_id}
                          spell={item.updated}
                          action="update"
                          changes={item.changes}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="delete" className="flex-1 min-h-0 mt-2">
                <ScrollArea className="h-[250px]">
                  {preview.toDelete.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      Aucun sort a supprimer
                    </p>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {preview.toDelete.map((spell) => (
                        <SpellPreviewCard
                          key={spell.notion_id}
                          spell={spell}
                          action="delete"
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button
                onClick={applySync}
                className="bg-purple-600 hover:bg-purple-700"
                disabled={
                  summary.toAdd + summary.toUpdate + summary.toDelete === 0
                }
              >
                Appliquer toutes les modifications
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Applying state */}
        {state === "applying" && (
          <div className="flex flex-col items-center py-12 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <p className="text-muted-foreground">
              Application des modifications...
            </p>
          </div>
        )}

        {/* Complete state */}
        {state === "complete" && result && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <p className="text-lg font-medium">Synchronisation terminee</p>
            <div className="flex gap-4 text-sm">
              <span className="text-green-500">{result.added} ajoutes</span>
              <span className="text-amber-500">{result.updated} mis a jour</span>
              <span className="text-red-500">{result.deleted} supprimes</span>
            </div>
            {result.errors.length > 0 && (
              <div className="text-sm text-red-400 text-center">
                {result.errors.length} erreur(s)
              </div>
            )}
            <Button onClick={() => handleOpenChange(false)}>Fermer</Button>
          </div>
        )}

        {/* Error state */}
        {state === "error" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <p className="text-lg font-medium text-red-400">Erreur</p>
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Fermer
              </Button>
              <Button onClick={loadPreview}>Reessayer</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Preview card for a spell in the sync dialog
function SpellPreviewCard({
  spell,
  action,
  changes,
}: {
  spell: CatalogSpellInput | CatalogSpell
  action: "add" | "update" | "delete"
  changes?: string[]
}) {
  const actionColors = {
    add: "border-green-500/30 bg-green-500/5",
    update: "border-amber-500/30 bg-amber-500/5",
    delete: "border-red-500/30 bg-red-500/5",
  }

  return (
    <div className={`p-3 rounded-lg border ${actionColors[action]}`}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{spell.name}</span>
        <Badge variant="outline" className="text-xs">
          {getSpellLevelLabel(spell.level)}
        </Badge>
        {spell.concentration && (
          <Badge variant="secondary" className="text-xs text-amber-400">
            C
          </Badge>
        )}
      </div>
      {spell.classes && spell.classes.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {spell.classes.join(", ")}
        </p>
      )}
      {changes && changes.length > 0 && (
        <p className="text-xs text-amber-400 mt-1">
          Modifie: {getSpellChangesSummary(changes)}
        </p>
      )}
    </div>
  )
}
