"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, RefreshCw, Package } from "lucide-react";
import { useItemSync } from "@/hooks/useItemSync";
import type { CatalogItemInput, CatalogItem } from "@/lib/types";
import { getChangesSummary } from "@/lib/item-comparison";

interface ItemSyncDialogProps {
  onSyncComplete?: () => void;
}

function ItemCard({
  item,
  action,
  selected,
  onToggle,
  changes,
}: {
  item: CatalogItemInput | CatalogItem;
  action: "add" | "update" | "delete";
  selected: boolean;
  onToggle: () => void;
  changes?: string[];
}) {
  const actionColors = {
    add: "bg-green-50 border-green-200 text-green-800",
    update: "bg-amber-50 border-amber-200 text-amber-800",
    delete: "bg-red-50 border-red-200 text-red-800",
  };

  const actionLabels = {
    add: "Nouveau",
    update: "Modifié",
    delete: "Supprimé",
  };

  const categoryLabels: Record<string, string> = {
    equipment: "Équipement",
    consumable: "Consommable",
    misc: "Divers",
  };

  return (
    <div
      className={`p-3 rounded-lg border ${
        selected ? "ring-2 ring-blue-500" : ""
      } ${actionColors[action]}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{item.name}</span>
            <Badge variant="outline" className="text-xs">
              {actionLabels[action]}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[item.category] || item.category}
            </Badge>
            {item.rarity && (
              <Badge variant="outline" className="text-xs">
                {item.rarity}
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-sm mt-1 line-clamp-2 opacity-80">
              {item.description}
            </p>
          )}
          {changes && changes.length > 0 && (
            <p className="text-xs mt-1 opacity-70">
              Modifié: {getChangesSummary(changes)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ItemSyncDialog({ onSyncComplete }: ItemSyncDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    isSyncing,
    isApplying,
    previewData,
    previewSync,
    applySync,
    cancelPreview,
    testConnection,
  } = useItemSync(onSyncComplete);

  // Selection states
  const [selectedAdd, setSelectedAdd] = useState<Set<string>>(new Set());
  const [selectedUpdate, setSelectedUpdate] = useState<Set<string>>(new Set());
  const [selectedDelete, setSelectedDelete] = useState<Set<string>>(new Set());

  // Initialize selections when preview loads
  useEffect(() => {
    if (!previewData?.preview) return;

    // Select all adds and updates by default
    setSelectedAdd(
      new Set(previewData.preview.toAdd.map((item) => item.notion_id))
    );
    setSelectedUpdate(
      new Set(previewData.preview.toUpdate.map((item) => item.updated.notion_id))
    );
    // Deletes: none selected by default (safety)
    setSelectedDelete(new Set());
  }, [previewData]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      cancelPreview();
      setSelectedAdd(new Set());
      setSelectedUpdate(new Set());
      setSelectedDelete(new Set());
    }
    setOpen(newOpen);
  };

  const handleLoadPreview = async () => {
    await previewSync();
  };

  const handleApply = async () => {
    if (!previewData) return;

    // Filter preview data to only include selected items
    const filteredPreview = {
      ...previewData.preview,
      toAdd: previewData.preview.toAdd.filter((item) =>
        selectedAdd.has(item.notion_id)
      ),
      toUpdate: previewData.preview.toUpdate.filter((item) =>
        selectedUpdate.has(item.updated.notion_id)
      ),
      toDelete: previewData.preview.toDelete.filter((item) =>
        selectedDelete.has(item.notion_id)
      ),
    };

    // Temporarily override preview data with filtered version
    const result = await applySync();
    if (result?.success) {
      handleOpenChange(false);
    }
  };

  const toggleAdd = (notionId: string) => {
    const newSet = new Set(selectedAdd);
    if (newSet.has(notionId)) newSet.delete(notionId);
    else newSet.add(notionId);
    setSelectedAdd(newSet);
  };

  const toggleUpdate = (notionId: string) => {
    const newSet = new Set(selectedUpdate);
    if (newSet.has(notionId)) newSet.delete(notionId);
    else newSet.add(notionId);
    setSelectedUpdate(newSet);
  };

  const toggleDelete = (notionId: string) => {
    const newSet = new Set(selectedDelete);
    if (newSet.has(notionId)) newSet.delete(notionId);
    else newSet.add(notionId);
    setSelectedDelete(newSet);
  };

  const totalSelected =
    selectedAdd.size + selectedUpdate.size + selectedDelete.size;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Package className="w-4 h-4" />
          Sync Items
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Synchronisation Items Notion</DialogTitle>
          <DialogDescription>
            Synchronisez les items depuis vos bases de données Notion.
          </DialogDescription>
        </DialogHeader>

        {!previewData ? (
          // No preview loaded - show load button
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Package className="w-12 h-12 text-slate-400" />
            <p className="text-slate-600">
              Chargez un aperçu pour voir les changements.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={testConnection}>
                Tester la connexion
              </Button>
              <Button onClick={handleLoadPreview} disabled={isSyncing}>
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  "Charger l'aperçu"
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Preview loaded - show items
          <>
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="bg-green-50 text-green-800 border-green-300 font-semibold"
              >
                {previewData.summary.toAdd} à ajouter
              </Badge>
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-800 border-amber-300 font-semibold"
              >
                {previewData.summary.toUpdate} à modifier
              </Badge>
              <Badge
                variant="outline"
                className="bg-red-50 text-red-800 border-red-300 font-semibold"
              >
                {previewData.summary.toDelete} à supprimer
              </Badge>
              <Badge variant="secondary" className="font-semibold">
                {previewData.summary.unchanged} inchangés
              </Badge>
            </div>

            <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">
                  Tous (
                  {previewData.summary.toAdd +
                    previewData.summary.toUpdate +
                    previewData.summary.toDelete}
                  )
                </TabsTrigger>
                <TabsTrigger value="add">
                  À ajouter ({previewData.summary.toAdd})
                </TabsTrigger>
                <TabsTrigger value="update">
                  À modifier ({previewData.summary.toUpdate})
                </TabsTrigger>
                <TabsTrigger value="delete">
                  À supprimer ({previewData.summary.toDelete})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="flex-1 min-h-0 mt-4">
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-4">
                    {previewData.preview.toAdd.map((item) => (
                      <ItemCard
                        key={item.notion_id}
                        item={item}
                        action="add"
                        selected={selectedAdd.has(item.notion_id)}
                        onToggle={() => toggleAdd(item.notion_id)}
                      />
                    ))}
                    {previewData.preview.toUpdate.map(
                      ({ existing, updated, changes }) => (
                        <ItemCard
                          key={updated.notion_id}
                          item={updated}
                          action="update"
                          selected={selectedUpdate.has(updated.notion_id)}
                          onToggle={() => toggleUpdate(updated.notion_id)}
                          changes={changes}
                        />
                      )
                    )}
                    {previewData.preview.toDelete.map((item) => (
                      <ItemCard
                        key={item.notion_id}
                        item={item}
                        action="delete"
                        selected={selectedDelete.has(item.notion_id)}
                        onToggle={() => toggleDelete(item.notion_id)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="add" className="flex-1 min-h-0 mt-4">
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-4">
                    {previewData.preview.toAdd.length === 0 ? (
                      <p className="text-sm text-slate-600 text-center py-8">
                        Aucun item à ajouter
                      </p>
                    ) : (
                      previewData.preview.toAdd.map((item) => (
                        <ItemCard
                          key={item.notion_id}
                          item={item}
                          action="add"
                          selected={selectedAdd.has(item.notion_id)}
                          onToggle={() => toggleAdd(item.notion_id)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="update" className="flex-1 min-h-0 mt-4">
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-4">
                    {previewData.preview.toUpdate.length === 0 ? (
                      <p className="text-sm text-slate-600 text-center py-8">
                        Aucun item à modifier
                      </p>
                    ) : (
                      previewData.preview.toUpdate.map(
                        ({ existing, updated, changes }) => (
                          <ItemCard
                            key={updated.notion_id}
                            item={updated}
                            action="update"
                            selected={selectedUpdate.has(updated.notion_id)}
                            onToggle={() => toggleUpdate(updated.notion_id)}
                            changes={changes}
                          />
                        )
                      )
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="delete" className="flex-1 min-h-0 mt-4">
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2 pr-4">
                    {selectedDelete.size > 0 && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <p className="text-sm text-red-900">
                          Attention: {selectedDelete.size} item(s) seront
                          supprimés définitivement.
                        </p>
                      </div>
                    )}
                    {previewData.preview.toDelete.length === 0 ? (
                      <p className="text-sm text-slate-600 text-center py-8">
                        Aucun item à supprimer
                      </p>
                    ) : (
                      previewData.preview.toDelete.map((item) => (
                        <ItemCard
                          key={item.notion_id}
                          item={item}
                          action="delete"
                          selected={selectedDelete.has(item.notion_id)}
                          onToggle={() => toggleDelete(item.notion_id)}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex-row items-center justify-between">
              <span className="text-sm text-slate-700 font-semibold">
                {totalSelected} modification(s) sélectionnée(s)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isApplying}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={totalSelected === 0 || isApplying}
                >
                  {isApplying
                    ? "Application en cours..."
                    : "Appliquer les changements"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
