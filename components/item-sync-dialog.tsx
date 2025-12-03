"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Package, Cloud, AlertCircle, CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ItemSyncDialogProps {
  onSyncComplete?: () => void;
}

interface SyncPreview {
  summary: {
    toAdd: number;
    toUpdate: number;
    toDelete: number;
    unchanged: number;
    total: number;
  };
  preview: {
    toAdd: any[];
    toUpdate: any[];
    toDelete: any[];
  };
}

export function ItemSyncDialog({ onSyncComplete }: ItemSyncDialogProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [previewData, setPreviewData] = useState<SyncPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const formatLastSync = (date: Date | null) => {
    if (!date) return "Jamais synchronisé";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Il y a ${diffDays}j`;
  };

  const handleOpenDialog = async () => {
    if (previewData) return; // Already have preview

    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/notion/items/sync/preview", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setPreviewData(data);
      } else {
        setError(data.error || "Erreur lors du chargement");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApply = async () => {
    if (!previewData) return;

    setIsApplying(true);
    setError(null);

    try {
      // Build operations from preview - apply all changes
      const operations = {
        add: previewData.preview.toAdd.map((item) => item.notion_id),
        update: previewData.preview.toUpdate.map((item) => item.updated.notion_id),
        delete: previewData.preview.toDelete.map((item) => item.notion_id),
      };

      const response = await fetch("/api/notion/items/sync/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations }),
      });

      const result = await response.json();

      if (result.success) {
        setLastSync(new Date());
        setPreviewData(null);
        onSyncComplete?.();
      } else {
        setError(result.errors?.join(", ") || "Erreur lors de la synchronisation");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = () => {
    setPreviewData(null);
    setError(null);
  };

  const isDialogOpen = previewData !== null;
  const hasChanges = previewData && (
    previewData.summary.toAdd > 0 ||
    previewData.summary.toUpdate > 0 ||
    previewData.summary.toDelete > 0
  );

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={handleOpenDialog}
              disabled={isSyncing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              {isSyncing ? "Chargement..." : "Sync Items"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{formatLastSync(lastSync)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Synchronisation Items
            </DialogTitle>
            <DialogDescription>
              Synchroniser les items depuis Notion
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {previewData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex flex-wrap gap-2">
                {previewData.summary.toAdd > 0 && (
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    +{previewData.summary.toAdd} à ajouter
                  </Badge>
                )}
                {previewData.summary.toUpdate > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    ~{previewData.summary.toUpdate} à modifier
                  </Badge>
                )}
                {previewData.summary.toDelete > 0 && (
                  <Badge className="bg-red-100 text-red-800 border-red-300">
                    -{previewData.summary.toDelete} à supprimer
                  </Badge>
                )}
                {!hasChanges && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Tout est à jour</span>
                  </div>
                )}
              </div>

              {previewData.summary.unchanged > 0 && (
                <p className="text-sm text-muted-foreground">
                  {previewData.summary.unchanged} item(s) inchangé(s)
                </p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isApplying}>
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              disabled={!hasChanges || isApplying}
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                "Appliquer"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
