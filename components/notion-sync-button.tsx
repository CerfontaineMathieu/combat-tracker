"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw, Cloud } from "lucide-react";
import { useNotionSync } from "@/hooks/useNotionSync";
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
  const { isSyncing, lastSync, syncMonsters } = useNotionSync(onSyncComplete);

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

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={syncMonsters}
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
            {isSyncing ? "Synchronisation..." : "Sync Notion"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{formatLastSync(lastSync)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
