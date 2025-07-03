'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import Link from 'next/link';

import './generating.css';

export default function VideoGeneratingPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  // Monitoreo en tiempo real del estado del video (sin polling activo)
  useEffect(() => {
    const videoRef = doc(db, 'videos', params.id);
    
    const unsubscribe = onSnapshot(videoRef, (doc) => {
      if (!doc.exists()) {
        toast.error('Video not found.');
        router.push('/dashboard');
        return;
      }

      const videoData = doc.data();
      
      if (videoData.status === 'completed' && (videoData.creatomateResults?.videoUrl || videoData.heygenResults?.videoUrl)) {
        toast.success('Video generated successfully!');
        router.push(`/export-view?id=${params.id}`);
        return;
      }
      
      if (videoData.status === 'editing') {
        // El video está siendo editado por Creatomate
        console.log('Video is being edited by Creatomate...');
      }
      
      if (videoData.status === 'error') {
        const errorMessage = videoData.error || 'An error occurred while generating the video.';
        toast.error(errorMessage);
        router.push(`/videos/${params.id}`); // Redirect back to edit page on error
        return;
      }
    }, (error) => {
      console.error('Error monitoring video status:', error);
      toast.error('Connection error while monitoring video.');
      router.push('/dashboard');
    });

    return () => unsubscribe();
  }, [params.id, router]);

  return (
    <div className="page-wrapper">
      <div className="container">
        <div className="success-card">
          <div className="success-content">
            <div className="success-icon">
              <div className="checkmark">✓</div>
            </div>
            <h1 className="success-title">Video Submitted Successfully!</h1>
            <p className="success-subtitle">
              Your AI avatar video is now being processed. We'll notify you as soon as it's ready!
            </p>
            <div className="time-estimate">
              <div className="time-title">Estimated completion time:</div>
              <div className="time-value">3-5 minutes</div>
            </div>
            

            <div className="tips-section">
              <h3 className="tips-title">Pro Tips while you wait:</h3>
              <div className="tip-item">Plan your next video - batch creation saves time!</div>
              <div className="tip-item">Check out our avatar library for different styles</div>
              <div className="tip-item">Prepare your social media strategy for when it's ready</div>
            </div>
            <div className="action-buttons">
              <Link href="/video-forms" className="btn btn-primary">
                Create Another Video
              </Link>
              <Link href="/dashboard" className="btn btn-secondary">
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 