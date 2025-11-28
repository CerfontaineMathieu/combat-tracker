"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { SyncItemCard } from "@/components/sync-item-card";
import type { SyncPreviewData, SyncOperations } from "@/lib/types";

interface NotionSyncDialogProps {
  open: boolean;
  previewData: SyncPreviewData | null;
  isApplying: boolean;
  onApply: (operations: SyncOperations) => void;
  onCancel: () => void;
}

export function NotionSyncDialog({
  open,
  previewData,
  isApplying,
  onApply,
  onCancel
}: NotionSyncDialogProps) {
  // Selection state: Set of monster names
  const [selectedAdd, setSelectedAdd] = useState<Set<string>>(new Set());
  const [selectedUpdate, setSelectedUpdate] = useState<Set<string>>(new Set());
  const [selectedDelete, setSelectedDelete] = useState<Set<string>>(new Set());

  // For updates: Map of monster name -> Set of field names
  const [updateFieldSelections, setUpdateFieldSelections] = useState<Map<string, Set<string>>>(
    new Map()
  );

  // Initialize selections when preview loads
  useEffect(() => {
    if (!previewData) return;

    const addSet = new Set<string>();
    const updateSet = new Set<string>();
    const updateFields = new Map<string, Set<string>>();

    previewData.items.forEach(item => {
      if (item.action === 'add') {
        addSet.add(item.monsterName);
      } else if (item.action === 'update') {
        updateSet.add(item.monsterName);
        // Select all fields by default
        const fields = new Set(item.comparison!.changedFields.map(f => f.field));
        updateFields.set(item.monsterName, fields);
      }
    });

    setSelectedAdd(addSet);
    setSelectedUpdate(updateSet);
    setSelectedDelete(new Set()); // Deletes: none selected by default (safety)
    setUpdateFieldSelections(updateFields);
  }, [previewData]);

  if (!previewData) return null;

  const { summary, items } = previewData;

  // Filter items by action
  const addItems = items.filter(i => i.action === 'add');
  const updateItems = items.filter(i => i.action === 'update');
  const deleteItems = items.filter(i => i.action === 'delete');
  const unchangedItems = items.filter(i => i.action === 'no_change');

  // Selection helpers
  const toggleAdd = (name: string) => {
    const newSet = new Set(selectedAdd);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelectedAdd(newSet);
  };

  const toggleUpdate = (name: string) => {
    const newSet = new Set(selectedUpdate);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelectedUpdate(newSet);
  };

  const toggleDelete = (name: string) => {
    const newSet = new Set(selectedDelete);
    if (newSet.has(name)) newSet.delete(name);
    else newSet.add(name);
    setSelectedDelete(newSet);
  };

  const toggleUpdateField = (monsterName: string, field: string) => {
    const newMap = new Map(updateFieldSelections);
    const fields = newMap.get(monsterName) || new Set();

    if (fields.has(field)) fields.delete(field);
    else fields.add(field);

    newMap.set(monsterName, fields);
    setUpdateFieldSelections(newMap);
  };

  // Build operations from selections
  const buildOperations = (): SyncOperations => {
    const operations: SyncOperations = {
      add: [],
      update: [],
      delete: []
    };

    // Add operations
    addItems.forEach(item => {
      if (selectedAdd.has(item.monsterName)) {
        operations.add.push({
          name: item.monsterName,
          notionId: item.notionId!
        });
      }
    });

    // Update operations
    updateItems.forEach(item => {
      if (selectedUpdate.has(item.monsterName)) {
        const selectedFields = updateFieldSelections.get(item.monsterName) || new Set();
        if (selectedFields.size > 0) {
          operations.update.push({
            name: item.monsterName,
            dbId: item.dbId!,
            fields: Array.from(selectedFields) as any,
            notionId: item.notionId!
          });
        }
      }
    });

    // Delete operations
    deleteItems.forEach(item => {
      if (selectedDelete.has(item.monsterName)) {
        operations.delete.push(item.dbId!);
      }
    });

    return operations;
  };

  const handleApply = () => {
    const operations = buildOperations();
    onApply(operations);
  };

  const totalSelected = selectedAdd.size + selectedUpdate.size + selectedDelete.size;
  const hasSelections = totalSelected > 0;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Synchronisation Notion - Aperçu</DialogTitle>
          <DialogDescription>
            Sélectionnez les modifications à appliquer à la base de données.
          </DialogDescription>

          <div className="flex gap-2 mt-2 flex-wrap">
            <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300 font-semibold">{summary.toAdd} à ajouter</Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-semibold">{summary.toUpdate} à modifier</Badge>
            <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300 font-semibold">{summary.toDelete} à supprimer</Badge>
            <Badge variant="secondary" className="font-semibold">{summary.unchanged} inchangés</Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              Tous ({summary.toAdd + summary.toUpdate + summary.toDelete})
            </TabsTrigger>
            <TabsTrigger value="add">À ajouter ({summary.toAdd})</TabsTrigger>
            <TabsTrigger value="update">À modifier ({summary.toUpdate})</TabsTrigger>
            <TabsTrigger value="delete">À supprimer ({summary.toDelete})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {addItems.map(item => (
                  <SyncItemCard
                    key={item.monsterName}
                    item={item}
                    selected={selectedAdd.has(item.monsterName)}
                    onToggleSelect={() => toggleAdd(item.monsterName)}
                  />
                ))}
                {updateItems.map(item => (
                  <SyncItemCard
                    key={item.monsterName}
                    item={item}
                    selected={selectedUpdate.has(item.monsterName)}
                    selectedFields={updateFieldSelections.get(item.monsterName)}
                    onToggleSelect={() => toggleUpdate(item.monsterName)}
                    onToggleField={(field) => toggleUpdateField(item.monsterName, field)}
                  />
                ))}
                {deleteItems.map(item => (
                  <SyncItemCard
                    key={item.monsterName}
                    item={item}
                    selected={selectedDelete.has(item.monsterName)}
                    onToggleSelect={() => toggleDelete(item.monsterName)}
                  />
                ))}
                {unchangedItems.length > 0 && (
                  <div className="pt-4">
                    <p className="text-sm text-slate-600 font-medium mb-2">{unchangedItems.length} monstres inchangés (masqués)</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="add" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {addItems.length === 0 ? (
                  <p className="text-sm text-slate-600 font-medium text-center py-8">Aucun monstre à ajouter</p>
                ) : (
                  addItems.map(item => (
                    <SyncItemCard
                      key={item.monsterName}
                      item={item}
                      selected={selectedAdd.has(item.monsterName)}
                      onToggleSelect={() => toggleAdd(item.monsterName)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="update" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {updateItems.length === 0 ? (
                  <p className="text-sm text-slate-600 font-medium text-center py-8">Aucun monstre à modifier</p>
                ) : (
                  updateItems.map(item => (
                    <SyncItemCard
                      key={item.monsterName}
                      item={item}
                      selected={selectedUpdate.has(item.monsterName)}
                      selectedFields={updateFieldSelections.get(item.monsterName)}
                      onToggleSelect={() => toggleUpdate(item.monsterName)}
                      onToggleField={(field) => toggleUpdateField(item.monsterName, field)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="delete" className="flex-1 min-h-0 mt-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {selectedDelete.size > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <p className="text-sm text-red-900">
                      Attention: {selectedDelete.size} monstre(s) seront supprimés définitivement.
                    </p>
                  </div>
                )}
                {deleteItems.length === 0 ? (
                  <p className="text-sm text-slate-600 font-medium text-center py-8">Aucun monstre à supprimer</p>
                ) : (
                  deleteItems.map(item => (
                    <SyncItemCard
                      key={item.monsterName}
                      item={item}
                      selected={selectedDelete.has(item.monsterName)}
                      onToggleSelect={() => toggleDelete(item.monsterName)}
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
            <Button variant="outline" onClick={onCancel} disabled={isApplying}>
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              disabled={!hasSelections || isApplying}
            >
              {isApplying ? "Application en cours..." : "Appliquer les changements"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
