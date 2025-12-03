import { useState } from 'react';
import { toast } from 'sonner';
import type { ItemSyncPreview, ItemSyncResult } from '@/lib/types';

interface ItemSyncPreviewResponse {
  success: boolean;
  summary: {
    toAdd: number;
    toUpdate: number;
    toDelete: number;
    unchanged: number;
    total: number;
  };
  preview: ItemSyncPreview;
}

interface DatabaseStatus {
  name: string;
  status: 'ok' | 'error' | 'not_configured';
  count?: number;
  error?: string;
}

interface ConnectionTestResponse {
  success: boolean;
  databases: DatabaseStatus[];
  error?: string;
}

export function useItemSync(onSyncComplete?: () => void) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [previewData, setPreviewData] = useState<ItemSyncPreviewResponse | null>(null);

  const previewSync = async (): Promise<ItemSyncPreviewResponse | null> => {
    setIsSyncing(true);
    setPreviewData(null);

    try {
      const response = await fetch('/api/notion/items/sync/preview', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Échec du chargement de l'aperçu");
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

  const applySync = async (): Promise<ItemSyncResult | null> => {
    if (!previewData) {
      toast.error('Aucun aperçu à appliquer');
      return null;
    }

    setIsApplying(true);

    try {
      // Build operations from preview data
      const operations = {
        add: previewData.preview.toAdd.map(item => item.notion_id),
        update: previewData.preview.toUpdate.map(item => item.updated.notion_id),
        delete: previewData.preview.toDelete.map(item => item.notion_id),
      };

      const response = await fetch('/api/notion/items/sync/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operations }),
      });

      const data: ItemSyncResult = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.errors?.[0] || 'Échec de la synchronisation');
      }

      setLastSync(new Date());
      setPreviewData(null);

      // Show result toast
      const { added, updated, deleted, errors } = data;
      if (errors.length > 0) {
        toast.warning('Synchronisation partiellement réussie', {
          description: `${added} ajoutés, ${updated} modifiés, ${deleted} supprimés. ${errors.length} erreurs.`,
        });
      } else {
        toast.success('Synchronisation réussie', {
          description: `${added} ajoutés, ${updated} modifiés, ${deleted} supprimés`,
        });
      }

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

  const testConnection = async (): Promise<ConnectionTestResponse | null> => {
    try {
      const response = await fetch('/api/notion/items/sync');
      const data: ConnectionTestResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }

      const okDatabases = data.databases.filter(db => db.status === 'ok');
      const totalItems = okDatabases.reduce((sum, db) => sum + (db.count || 0), 0);

      if (data.success) {
        toast.success('Connexion Notion réussie', {
          description: `${totalItems} items trouvés dans ${okDatabases.length} base(s)`,
        });
      } else {
        toast.warning('Connexion partielle', {
          description: 'Certaines bases ne sont pas configurées',
        });
      }

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      toast.error('Erreur de connexion Notion', {
        description: message,
      });
      return null;
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
