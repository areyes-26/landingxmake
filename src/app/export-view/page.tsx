// File: src/app/export-view/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Instagram } from 'lucide-react';
import { SiTiktok, SiYoutube, SiLinkedin } from 'react-icons/si';
import { RiTwitterXFill } from 'react-icons/ri';
import type { VideoData } from '@/types/video';
import './custom-scrollbar.css';
import './export-view.css';

export default function ExportViewPage() {
  const router = useRouter();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const searchParams = useSearchParams();
  const videoId = searchParams.get('id');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState<'short' | 'long' | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    if (!videoId) {
      toast.error('No video ID provided');
      return;
    }
    const videoRef = doc(db, 'videos', videoId);
    const unsubscribe = onSnapshot(videoRef, (docSnap) => {
      if (!docSnap.exists()) {
        toast.error('Video not found');
        return;
      }
      const data = docSnap.data() as VideoData;
      setVideoData({ ...data, id: docSnap.id });

      // Fetch copys only after we have the main video data
      fetch(`/api/videos/${videoId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Could not fetch copies');
        })
        .then(copyData => {
          setVideoData(prevData => {
            if (!prevData) return null;
            // Merge copies without overwriting existing fields like createdAt
            return {
              ...prevData,
              shortCopy: copyData.shortCopy,
              longCopy: copyData.longCopy,
            };
          });
        })
        .catch(err => {
          console.error('Error fetching copies:', err);
        });
    });

    return () => unsubscribe();
  }, [videoId]);

  const confirmDownload = async () => {
    setShowDownloadModal(false);
    await handleDownload();
  }

  const handleDownload = async () => {
    const downloadUrl = videoData?.heygenResults?.videoUrl || videoData?.videoUrl;
    if (!downloadUrl) {
      toast.error('No video available for download');
      return;
    }
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoData.videoTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading video:', error);
      toast.error('Error downloading video');
    }
  };

  const handleInstagramConnect = () => {
    const state = crypto.randomUUID();
    document.cookie = `instagram_state=${state}; path=/; max-age=600`;
  
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID;
    const redirectUri = 'https://us-central1-landing-x-make.cloudfunctions.net/instagramCallbackFn';
    const scope = 'instagram_business_basic,instagram_business_content_publish';
  
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth` +
      `?client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&scope=${scope}` +
      `&response_type=code` +
      `&state=${state}`;
  
    window.location.href = authUrl;
  };  
  
  const handleCopyText = (text: string, type: 'short' | 'long') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const handleInstagramShare = () => {
    window.open('https://www.instagram.com/', '_blank');
  };

  const handleTikTokShare = () => {
    window.open('https://www.tiktok.com/tiktokstudio/upload', '_blank');
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };
  
  const getCopy = (copy: any) => {
    if (!copy) return 'No copy available...';
    if (typeof copy === 'object' && copy.content) return copy.content;
    return copy;
    }

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Invalid Date';
    
    // Handle Firebase Timestamp object
    if (timestamp && typeof timestamp.seconds === 'number') {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
  
    // Handle ISO string or other date strings
    const date = new Date(timestamp);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
  
    return 'Invalid Date';
  }

  if (!videoData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  const shortCopyText = getCopy(videoData.shortCopy);
  const longCopyText = getCopy(videoData.longCopy);

  return (
    <>
      <div className="container export-view-container">
          <Button
            variant="ghost"
            className="back-to-dashboard-btn"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        <div className="page-header text-center">
          <h1 className="page-title">Video Details</h1>
          <p className="page-subtitle">Review and manage your video content with optimized social media copies</p>
          </div>

        <div className="content-grid">
          <div className="video-section">
            <h2 className="section-title">Video Preview</h2>
            <div className="video-container">
                        <video
                ref={videoRef}
                className="video-player"
                          poster={videoData.thumbnailUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                onClick={togglePlay}
                src={videoData.heygenResults?.videoUrl}
                        >
                Your browser does not support the video tag.
                        </video>
              {!isPlaying && (
                <div className="video-overlay" onClick={togglePlay}>
                  <div className="play-icon"></div>
                      </div>
              )}
                    </div>
            <div className="video-info">
              <h3 className="video-title">{videoData.videoTitle}</h3>
              <p className="video-meta">1080x1920 • Created {formatDate(videoData.createdAt)}</p>
                      </div>
                    </div>

          <div className="copies-section">
            <h2 className="section-title">Social Media Copies</h2>
            <div className="copy-group">
              <div className="copy-label">
                <span className="copy-title">
                  Short Copy
                  <div className="help-icon">?
                    <div className="tooltip">Perfect for Twitter, Instagram captions, and social posts with character limits</div>
                    </div>
                </span>
                <button className={`copy-btn ${copied === 'short' ? 'copied' : ''}`} onClick={() => handleCopyText(shortCopyText, 'short')}>
                  {copied === 'short' ? 'Copied!' : 'Copy'}
                </button>
                        </div>
              <textarea className="copy-textarea short-copy" readOnly value={shortCopyText}></textarea>
                                </div>

            <div className="copy-group">
              <div className="copy-label">
                <span className="copy-title">
                  Long Copy
                  <div className="help-icon">?
                    <div className="tooltip">Ideal for LinkedIn posts, blog articles, newsletters, and detailed content</div>
                          </div>
                </span>
                <button className={`copy-btn ${copied === 'long' ? 'copied' : ''}`} onClick={() => handleCopyText(longCopyText, 'long')}>
                  {copied === 'long' ? 'Copied!' : 'Copy'}
                </button>
                        </div>
              <textarea className="copy-textarea long-copy" readOnly value={longCopyText}></textarea>
                                </div>

            <div className="actions-section">
              <div className="share-buttons">
              <button className="share-btn share-btn-instagram" title="Connect Instagram" onClick={handleInstagramConnect}>
                  <Instagram className="w-6 h-6" />
                </button>
                <button className="share-btn share-btn-twitter" title="Share on Twitter" disabled>
                  <RiTwitterXFill className="w-6 h-6" />
                </button>
                <button className="share-btn share-btn-linkedin" title="Share on LinkedIn" disabled>
                  <SiLinkedin className="w-6 h-6" />
                </button>
                <button className="share-btn share-btn-tiktok" title="Share on TikTok" onClick={handleTikTokShare}>
                  <SiTiktok className="w-6 h-6" />
                </button>
                <button className="share-btn share-btn-youtube" title="Share on YouTube" disabled>
                  <SiYoutube className="w-6 h-6" />
                </button>
              </div>
              <button className="download-btn" onClick={() => setShowDownloadModal(true)} disabled={!(videoData.heygenResults?.videoUrl || videoData.videoUrl)}>
                Download Video
              </button>
            </div>
          </div>
        </div>
      </div>
      {showDownloadModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="modal-title">Confirm Download</h2>
            <p className="modal-text">Your video will be downloaded in MP4 format.</p>
            <div className="modal-actions">
              <button onClick={() => setShowDownloadModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={confirmDownload} className="btn btn-primary">Confirm</button>
            </div>
          </div>
    </div>
      )}
    </>
  );
}