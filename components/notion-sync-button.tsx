"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, Cloud } from "lucide-react";
import { useNotionSync } from "@/hooks/useNotionSync";
import { NotionSyncDialog } from "@/components/notion-sync-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NotionSyncButtonProps {
  onSyncComplete?: () => void;
}

export function NotionSyncButton({ onSyncComplete }: NotionSyncButtonProps) {
  const {
    isSyncing,
    isApplying,
    lastSync,
    previewData,
    previewSync,
    applySync,
    cancelPreview
  } = useNotionSync(onSyncComplete);

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
    if (!previewData) {
      await previewSync();
    }
  };

  const handleApply = async (operations: any) => {
    await applySync(operations);
  };

  const isDialogOpen = previewData !== null;

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
                <Cloud className="h-4 w-4" />
              )}
              {isSyncing ? "Chargement..." : "Sync Notion"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{formatLastSync(lastSync)}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <NotionSyncDialog
        open={isDialogOpen}
        previewData={previewData}
        isApplying={isApplying}
        onApply={handleApply}
        onCancel={cancelPreview}
      />
    </>
  );
}
