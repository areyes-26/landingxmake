import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Verifica si un URL de HeyGen ha expirado basándose en el parámetro 'Expires'
 * @param url - El URL del video de HeyGen
 * @returns true si el URL ha expirado, false si aún es válido
 */
export function isHeyGenUrlExpired(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const expiresParam = urlObj.searchParams.get('Expires');
    
    if (!expiresParam) {
      // Si no hay parámetro Expires, asumimos que está expirado
      return true;
    }
    
    const expiresTimestamp = parseInt(expiresParam, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);
    
    // Consideramos expirado si faltan menos de 24 horas (86400 segundos)
    const bufferTime = 86400;
    return currentTimestamp >= (expiresTimestamp - bufferTime);
  } catch (error) {
    console.error('Error checking URL expiration:', error);
    // En caso de error, asumimos que está expirado
    return true;
  }
}

/**
 * Verifica si un video necesita refrescar su URL
 * @param videoData - Los datos del video
 * @returns true si necesita refrescar, false si está bien
 */
export function needsUrlRefresh(videoData: any): boolean {
  if (!videoData?.heygenResults?.videoUrl) {
    return false;
  }
  
  // Verificar si el URL ha expirado
  if (isHeyGenUrlExpired(videoData.heygenResults.videoUrl)) {
    return true;
  }
  
  // Verificar si el último refresh fue hace más de 6 días
  const lastRefresh = videoData.heygenResults?.lastUrlRefresh;
  if (lastRefresh) {
    const lastRefreshDate = new Date(lastRefresh);
    const sixDaysAgo = new Date(Date.now() - (6 * 24 * 60 * 60 * 1000));
    return lastRefreshDate < sixDaysAgo;
  }
  
  return false;
}
