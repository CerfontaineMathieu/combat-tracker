import { useState } from 'react';
import { toast } from 'sonner';

interface SyncResult {
  message: string;
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export function useNotionSync(onSyncComplete?: () => void) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const syncMonsters = async (): Promise<SyncResult | null> => {
    setIsSyncing(true);

    try {
      const response = await fetch('/api/notion/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Échec de la synchronisation');
      }

      setLastSync(new Date());

      // Show success toast
      toast.success(`Synchronisation réussie`, {
        description: `${data.success} monstres synchronisés${data.failed > 0 ? `, ${data.failed} échecs` : ''}`,
      });

      // Call the callback if provided
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
      setIsSyncing(false);
    }
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
    lastSync,
    syncMonsters,
    testConnection,
  };
}
