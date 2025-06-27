import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface UseBatchUrlRefreshProps {
  onRefreshComplete?: (results: any[]) => void;
}

export function useBatchUrlRefresh({ onRefreshComplete }: UseBatchUrlRefreshProps = {}) {
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshBatchUrls = useCallback(async (videoIds: string[]) => {
    if (!user || !videoIds.length) return;
    
    setIsRefreshing(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/videos/batch-refresh-urls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh video URLs');
      }

      const result = await response.json();
      
      // Mostrar resumen de resultados
      const { summary } = result;
      if (summary.successful > 0) {
        toast.success(`Successfully refreshed ${summary.successful} video URLs`);
      }
      
      if (summary.failed > 0) {
        toast.error(`Failed to refresh ${summary.failed} video URLs`);
      }

      // Llamar callback si se proporciona
      if (onRefreshComplete) {
        onRefreshComplete(result.results);
      }

      return result;
    } catch (error) {
      console.error('Error refreshing batch URLs:', error);
      toast.error('Failed to refresh video URLs. Please try again later.');
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [user, onRefreshComplete]);

  return {
    isRefreshing,
    refreshBatchUrls,
  };
} 