import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { needsUrlRefresh } from '@/lib/utils';
import { toast } from 'sonner';

interface UseVideoUrlRefreshProps {
  videoData: any;
  videoId: string;
  onUrlRefreshed: (newData: any) => void;
}

export function useVideoUrlRefresh({ 
  videoData, 
  videoId, 
  onUrlRefreshed 
}: UseVideoUrlRefreshProps) {
  const { user } = useAuth();
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false);

  const refreshVideoUrl = useCallback(async () => {
    if (!user || !videoId) return;
    
    setIsRefreshingUrl(true);
    try {
      const token = await user.getIdToken();
      
      // Determinar qué endpoint usar basado en el estado del video
      let endpoint = `/api/videos/${videoId}/refresh-url`;
      
      if (videoData?.status === 'editing' && videoData?.creatomateResults?.renderId) {
        // Si está en edición, verificar estado de Creatomate
        const response = await fetch(`/api/creatomate/check-status?videoId=${videoId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to check Creatomate status');
        }

        const result = await response.json();
        
        // Actualizar los datos del video con el nuevo URL de Creatomate
        const updatedVideoData = {
          ...videoData,
          creatomateResults: {
            ...videoData.creatomateResults,
            videoUrl: result.url,
            status: result.status,
            lastUrlRefresh: new Date().toISOString(),
          },
          videoUrl: result.url,
        };

        onUrlRefreshed(updatedVideoData);
        toast.success('Creatomate video URL refreshed successfully');
        return;
      } else {
        // Usar el endpoint de HeyGen
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to refresh video URL');
        }

        const result = await response.json();
        
        // Actualizar los datos del video con el nuevo URL
        const updatedVideoData = {
          ...videoData,
          heygenResults: {
            ...videoData.heygenResults,
            videoUrl: result.videoUrl,
            gifUrl: result.gifUrl,
            thumbnailUrl: result.thumbnailUrl,
            lastUrlRefresh: new Date().toISOString(),
          },
          videoUrl: result.videoUrl,
        };

        onUrlRefreshed(updatedVideoData);
        toast.success('Video URL refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing video URL:', error);
      toast.error('Failed to refresh video URL. Please try again later.');
    } finally {
      setIsRefreshingUrl(false);
    }
  }, [user, videoId, videoData, onUrlRefreshed]);

  // Verificar automáticamente si el URL necesita ser refrescado
  useEffect(() => {
    if (videoData && needsUrlRefresh(videoData)) {
      console.log('Video URL needs refresh, attempting to refresh...');
      refreshVideoUrl();
    }
  }, [videoData, refreshVideoUrl]);

  return {
    isRefreshingUrl,
    refreshVideoUrl,
  };
} 