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
      const response = await fetch(`/api/videos/${videoId}/refresh-url`, {
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