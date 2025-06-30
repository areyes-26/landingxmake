"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaTiktok } from 'react-icons/fa';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function TikTokSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);
  const [isLinking, setIsLinking] = useState(true);

  useEffect(() => {
    const linkAccount = async () => {
      if (!user) return;
      
      const state = searchParams.get('state');
      if (!state) {
        toast.error('Invalid authorization state');
        router.push('/account-setting?section=connections');
        return;
      }

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/tiktok/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ state })
        });

        if (response.ok) {
          toast.success('TikTok account linked successfully!');
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to link TikTok account');
        }
      } catch (error) {
        console.error('Error linking TikTok account:', error);
        toast.error('Failed to link TikTok account');
      } finally {
        setIsLinking(false);
      }
    };

    linkAccount();
  }, [user, searchParams, router]);

  useEffect(() => {
    if (!isLinking) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            router.push('/account-setting?section=connections');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [router, isLinking]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full mx-4 text-center">
        <div className="mb-6">
          <FaTiktok className="w-16 h-16 mx-auto text-black mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">TikTok Connected!</h1>
          <p className="text-gray-300">
            {isLinking 
              ? 'Linking your TikTok account...' 
              : 'Your TikTok account has been successfully connected. You can now export your videos directly to TikTok.'
            }
          </p>
        </div>
        
        {!isLinking && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
            <p className="text-green-400 text-sm">
              ✓ Account successfully linked<br/>
              ✓ Ready for video export
            </p>
          </div>
        )}

        {!isLinking && (
          <div className="text-gray-400 text-sm">
            Redirecting to account settings in {countdown} seconds...
          </div>
        )}
        
        <button
          onClick={() => router.push('/account-setting?section=connections')}
          className="mt-4 w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
          disabled={isLinking}
        >
          {isLinking ? 'Linking...' : 'Go to Account Settings'}
        </button>
      </div>
    </div>
  );
} 