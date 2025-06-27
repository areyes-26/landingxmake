import React from 'react';
import { isHeyGenUrlExpired } from '@/lib/utils';

interface UrlExpirationIndicatorProps {
  videoUrl?: string;
  lastRefresh?: string;
  className?: string;
}

export function UrlExpirationIndicator({ 
  videoUrl, 
  lastRefresh, 
  className = '' 
}: UrlExpirationIndicatorProps) {
  if (!videoUrl) {
    return null;
  }

  const isExpired = isHeyGenUrlExpired(videoUrl);
  
  // Calcular días restantes
  const getDaysRemaining = () => {
    try {
      const urlObj = new URL(videoUrl);
      const expiresParam = urlObj.searchParams.get('Expires');
      
      if (!expiresParam) return 0;
      
      const expiresTimestamp = parseInt(expiresParam, 10);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const secondsRemaining = expiresTimestamp - currentTimestamp;
      
      return Math.max(0, Math.ceil(secondsRemaining / (24 * 60 * 60)));
    } catch {
      return 0;
    }
  };

  const daysRemaining = getDaysRemaining();

  if (isExpired) {
    return (
      <div className={`flex items-center gap-2 text-red-400 text-sm ${className}`}>
        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
        <span>URL expired</span>
      </div>
    );
  }

  if (daysRemaining <= 1) {
    return (
      <div className={`flex items-center gap-2 text-orange-400 text-sm ${className}`}>
        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
        <span>Expires soon ({daysRemaining} day{daysRemaining !== 1 ? 's' : ''} left)</span>
      </div>
    );
  }

  if (daysRemaining <= 3) {
    return (
      <div className={`flex items-center gap-2 text-yellow-400 text-sm ${className}`}>
        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
        <span>{daysRemaining} days left</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-green-400 text-sm ${className}`}>
      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
      <span>{daysRemaining} days left</span>
    </div>
  );
} 