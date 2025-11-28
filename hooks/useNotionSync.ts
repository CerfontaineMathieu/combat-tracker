import { useState } from 'react';
import { toast } from 'sonner';
import type { SyncPreviewData, SyncOperations, SyncApplyResult } from '@/lib/types';

export function useNotionSync(onSyncComplete?: () => void) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [previewData, setPreviewData] = useState<SyncPreviewData | null>(null);

  const previewSync = async (): Promise<SyncPreviewData | null> => {
    setIsSyncing(true);
    setPreviewData(null);

    try {
      const response = await fetch('/api/notion/sync/preview', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Échec du chargement de l\'aperçu');
      }

      setPreviewData(data);

      toast.success('Aperçu chargé', {
        description: `${data.summary.toAdd} à ajouter, ${data.summary.toUpdate} à modifier, ${data.summary.toDelete} à supprimer`,
      });

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error('Erreur de chargement', {
        description: message,
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  };

  const applySync = async (operations: SyncOperations): Promise<SyncApplyResult | null> => {
    setIsApplying(true);

    try {
      const response = await fetch('/api/notion/sync/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Échec de la synchronisation');
      }

      setLastSync(new Date());
      setPreviewData(null); // Clear preview after apply

      // Show result toast
      const { added, updated, deleted, errors } = data.results;
      if (errors.length > 0) {
        toast.warning('Synchronisation partiellement réussie', {
          description: `${added} ajoutés, ${updated} modifiés, ${deleted} supprimés. ${errors.length} erreurs.`,
        });
      } else {
        toast.success('Synchronisation réussie', {
          description: `${added} ajoutés, ${updated} modifiés, ${deleted} supprimés`,
        });
      }

      // Call completion callback
      if (onSyncComplete) {
        onSyncComplete();
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error('Erreur de synchronisation', {
        description: message,
      });
      return null;
    } finally {
      setIsApplying(false);
    }
  };

  const cancelPreview = () => {
    setPreviewData(null);
  };

  const testConnection = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/notion/sync');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error);
      }

      toast.success('Connexion Notion réussie', {
        description: `${data.count} monstres trouvés dans Notion`,
      });

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error('Erreur de connexion Notion', {
        description: message,
      });
      return false;
    }
  };

  return {
    isSyncing,
    isApplying,
    lastSync,
    previewData,
    previewSync,
    applySync,
    cancelPreview,
    testConnection,
  };
}
