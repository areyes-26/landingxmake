// File: src/app/export-view/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, getDoc, doc as docFS } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Instagram } from 'lucide-react';
import { SiTiktok, SiYoutube, SiLinkedin } from 'react-icons/si';
import { RiTwitterXFill } from 'react-icons/ri';
import type { VideoData } from '@/types/video';
import './custom-scrollbar.css';
import './export-view.css';
import { useAuth } from '@/hooks/useAuth';

export default function ExportViewPage() {
  const router = useRouter();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const searchParams = useSearchParams();
  const videoId = searchParams.get('id');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState<'short' | 'long' | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const { user } = useAuth();
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [ytTitle, setYtTitle] = useState('');
  const [ytDescription, setYtDescription] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [tiktokTitle, setTiktokTitle] = useState('');
  const [tiktokDescription, setTiktokDescription] = useState('');
  const [tiktokPrivacy, setTiktokPrivacy] = useState('public');
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [igCaption, setIgCaption] = useState('');
  const [igLoading, setIgLoading] = useState(false);
  const [isReEditing, setIsReEditing] = useState(false);

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
      const videoDataWithId = { ...data, id: docSnap.id };
      
      setVideoData(videoDataWithId);

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
    // Priorizar el video de Creatomate si está disponible, sino usar el de HeyGen
    const downloadUrl = videoData?.creatomateResults?.videoUrl || videoData?.heygenResults?.videoUrl || videoData?.videoUrl;
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

  const handleInstagramShare = () => {
    if (!user) {
      toast.error('You must be logged in to export to Instagram.');
      return;
    }
    if (!videoData) {
      toast.error('No video data available.');
      return;
    }
    setIgCaption(getCopy(videoData.shortCopy));
    setShowInstagramModal(true);
  };

  const handleTikTokShare = () => {
    if (!user) {
      toast.error('You must be logged in to export to TikTok.');
      return;
    }
    if (!videoData) {
      toast.error('No video data available.');
      return;
    }
    setTiktokTitle(videoData.videoTitle || 'Video from LandingXMake');
    let shortCopy: any = videoData.shortCopy;
    if (shortCopy && typeof shortCopy === 'object' && 'content' in shortCopy) {
      shortCopy = shortCopy.content;
    }
    setTiktokDescription(shortCopy || '');
    setTiktokPrivacy('public');
    setShowTikTokModal(true);
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

  // Función helper para formatear fechas de Firebase
  const formatFirebaseDate = (date: any) => {
    if (!date) return 'Unknown date';
    if (typeof date === 'object' && 'toDate' in date) {
      return date.toDate().toLocaleDateString();
    }
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'Unknown date';
    }
  };

  const handleYouTubeExport = () => {
    if (!user) {
      toast.error('You must be logged in to export to YouTube.');
      return;
    }
    if (!videoData) {
      toast.error('No video data available.');
      return;
    }
    setYtTitle(videoData.videoTitle || 'Video from LandingXMake');
    let shortCopy: any = videoData.shortCopy;
    if (shortCopy && typeof shortCopy === 'object' && 'content' in shortCopy) {
      shortCopy = shortCopy.content;
    }
    setYtDescription(shortCopy || '');
    setShowYouTubeModal(true);
  };

  const confirmYouTubeExport = async () => {
    if (!user || !videoData) return;
    setYtLoading(true);
    try {
      const downloadUrl = videoData.heygenResults?.videoUrl || videoData.videoUrl;
      if (!downloadUrl) {
        toast.error('No video available for upload.');
        setYtLoading(false);
        return;
      }
      let descriptionToSend: any = ytDescription;
      if (descriptionToSend && typeof descriptionToSend === 'object' && 'content' in descriptionToSend) {
        descriptionToSend = descriptionToSend.content;
      }
      const res = await fetch('/api/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoUrl: downloadUrl,
          title: ytTitle,
          description: descriptionToSend,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'YouTube upload failed');
      }
      setShowYouTubeModal(false);
      // toast.success(
      //   <span>
      //     Video uploaded to YouTube!<br />
      //     <a href={data.videoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
      //       View on YouTube
      //     </a><br />
      //     <a href={`https://studio.youtube.com/video/${data.videoId}/edit`} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>
      //       Edit in YouTube Studio
      //     </a>
      //   </span>,
      //   { duration: 12000 }
      // );
    } catch (err: any) {
      console.error('YouTube upload error:', err);
      toast.error('Failed to upload video to YouTube: ' + (err.message || err));
    } finally {
      setYtLoading(false);
    }
  };

  const handleCopyText = (text: string, type: 'short' | 'long') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success('Text copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  const confirmTikTokExport = async () => {
    if (!user || !videoData) return;
    setTiktokLoading(true);
    try {
      const downloadUrl = videoData.heygenResults?.videoUrl || videoData.videoUrl;
      if (!downloadUrl) {
        toast.error('No video available for upload.');
        setTiktokLoading(false);
        return;
      }
      
      const token = await user.getIdToken();
      const res = await fetch('/api/tiktok/upload', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          videoUrl: downloadUrl,
          title: tiktokTitle,
          description: tiktokDescription,
          privacy: tiktokPrivacy,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'TikTok upload failed');
      }
      setShowTikTokModal(false);
      toast.success('Video uploaded to TikTok successfully!');
    } catch (error: any) {
      console.error('TikTok upload error:', error);
      toast.error('Failed to upload video to TikTok: ' + (error.message || error));
    } finally {
      setTiktokLoading(false);
    }
  };

  const confirmInstagramExport = async () => {
    if (!user || !videoData) return;
    setIgLoading(true);
    try {
      const downloadUrl = videoData.heygenResults?.videoUrl || videoData.videoUrl;
      if (!downloadUrl) {
        toast.error('No video available for upload.');
        setIgLoading(false);
        return;
      }
      const res = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          videoUrl: downloadUrl,
          caption: igCaption,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Instagram upload failed');
      }
      setShowInstagramModal(false);
      toast.success('Video export started! It will be published on Instagram soon.');
    } catch (error) {
      console.error('Error exporting to Instagram:', error);
      toast.error('Error exporting to Instagram');
    } finally {
      setIgLoading(false);
    }
  };

  const handleReEdit = async () => {
    if (!user || !videoData) return;
    
    setIsReEditing(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/creatomate/re-edit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: videoId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to re-edit video');
      }

      const result = await response.json();
      toast.success('Video sent for re-editing with Creatomate!');
      // Redirigir a la página de generación para monitorear el progreso
      router.push(`/videos/${videoId}/generating`);
    } catch (error) {
      console.error('Error re-editing video:', error);
      toast.error('Failed to re-edit video. Please try again.');
    } finally {
      setIsReEditing(false);
    }
  };

  if (!videoData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0c0d1f' }} className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            Loading video...
          </p>
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
                src={videoData.creatomateResults?.videoUrl || videoData.heygenResults?.videoUrl}
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
              <h1 className="video-title">{videoData.videoTitle}</h1>
              <div className="video-meta">
                <span className="video-date">
                  {formatFirebaseDate(videoData.createdAt)}
                </span>
              </div>
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
              <button className="share-btn share-btn-instagram" title="Export to Instagram" onClick={handleInstagramShare}>
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
                <button className="share-btn share-btn-youtube" title="Export to YouTube" onClick={handleYouTubeExport}>
                  <SiYoutube className="w-6 h-6" />
                </button>
              </div>
              <div className="action-buttons">
                <button 
                  className="download-btn" 
                  onClick={() => setShowDownloadModal(true)} 
                  disabled={!(videoData.creatomateResults?.videoUrl || videoData.heygenResults?.videoUrl || videoData.videoUrl)}
                >
                  Download Video
                </button>
                {/* {videoData.creatomateResults?.videoUrl && (
                  <button 
                    className="re-edit-btn" 
                    onClick={handleReEdit}
                    disabled={isReEditing}
                    title="Re-edit video with Creatomate"
                  >
                    {isReEditing ? 'Re-editing...' : 'Re-edit Video'}
                  </button>
                )} */}
              </div>
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
              <button onClick={() => setShowDownloadModal(false)} className="modal-btn modal-btn-secondary">Cancel</button>
              <button onClick={confirmDownload} className="modal-btn modal-btn-primary">Confirm</button>
            </div>
          </div>
    </div>
      )}
      {showYouTubeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ minWidth: 380, maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center', letterSpacing: 0.2 }}>Export to YouTube</h3>
            <label style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>Title</label>
            <input
              style={{ padding: '0.5rem', borderRadius: 8, border: '1.5px solid #31344b', background: '#181c2a', color: '#fff', fontSize: 15, marginBottom: 8, outline: 'none', fontWeight: 500 }}
              value={ytTitle}
              onChange={e => setYtTitle(e.target.value)}
              maxLength={100}
            />
            <label style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>Description</label>
            <textarea
              className="custom-scrollbar"
              style={{ padding: '0.5rem', borderRadius: 8, border: '1.5px solid #31344b', background: '#181c2a', color: '#fff', fontSize: 15, minHeight: 220, marginBottom: 8, outline: 'none', fontWeight: 500, resize: 'none', maxHeight: 400 }}
              value={ytDescription}
              onChange={e => setYtDescription(e.target.value)}
              maxLength={5000}
            />
            <div style={{ fontSize: 13, color: '#a3a3a3', marginBottom: 8, textAlign: 'center' }}>
              You can edit the video in YouTube Studio after upload.<br />
              The video will be uploaded as <b>private</b> by default.
            </div>
            <div className="modal-actions">
              <button
                onClick={confirmYouTubeExport}
                disabled={ytLoading}
                className="modal-btn modal-btn-primary"
              >
                {ytLoading ? 'Exporting...' : 'Confirm export'}
              </button>
              <button
                onClick={() => setShowYouTubeModal(false)}
                disabled={ytLoading}
                className="modal-btn modal-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showTikTokModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ minWidth: 380, maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center', letterSpacing: 0.2 }}>Export to TikTok</h3>
            <label style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>Title</label>
            <input
              style={{ padding: '0.5rem', borderRadius: 8, border: '1.5px solid #31344b', background: '#181c2a', color: '#fff', fontSize: 15, marginBottom: 8, outline: 'none', fontWeight: 500 }}
              value={tiktokTitle}
              onChange={e => setTiktokTitle(e.target.value)}
              maxLength={100}
            />
            <label style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>Description</label>
            <textarea
              className="custom-scrollbar"
              style={{ padding: '0.5rem', borderRadius: 8, border: '1.5px solid #31344b', background: '#181c2a', color: '#fff', fontSize: 15, minHeight: 120, marginBottom: 8, outline: 'none', fontWeight: 500, resize: 'none', maxHeight: 200 }}
              value={tiktokDescription}
              onChange={e => setTiktokDescription(e.target.value)}
              maxLength={2000}
            />
            <label style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>Privacy</label>
            <select
              style={{ padding: '0.5rem', borderRadius: 8, border: '1.5px solid #31344b', background: '#181c2a', color: '#fff', fontSize: 15, marginBottom: 8, outline: 'none', fontWeight: 500 }}
              value={tiktokPrivacy}
              onChange={e => setTiktokPrivacy(e.target.value)}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="draft">Draft</option>
            </select>
            <div style={{ fontSize: 13, color: '#a3a3a3', marginBottom: 8, textAlign: 'center' }}>
              Your video will be uploaded directly to TikTok with the settings provided.
            </div>
            <div className="modal-actions">
              <button
                onClick={confirmTikTokExport}
                disabled={tiktokLoading}
                className="modal-btn modal-btn-primary"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', color: 'white' }}
              >
                {tiktokLoading ? 'Uploading...' : 'Upload to TikTok'}
              </button>
              <button
                onClick={() => setShowTikTokModal(false)}
                disabled={tiktokLoading}
                className="modal-btn modal-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {showInstagramModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ minWidth: 380, maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, textAlign: 'center', letterSpacing: 0.2 }}>Export to Instagram</h3>
            <label style={{ fontWeight: 500, fontSize: 15, marginBottom: 2 }}>Caption</label>
            <textarea
              className="custom-scrollbar"
              style={{ padding: '0.5rem', borderRadius: 8, border: '1.5px solid #31344b', background: '#181c2a', color: '#fff', fontSize: 15, minHeight: 220, marginBottom: 8, outline: 'none', fontWeight: 500, resize: 'none', maxHeight: 400 }}
              value={igCaption}
              onChange={e => setIgCaption(e.target.value)}
              maxLength={5000}
            />
            <div style={{ fontSize: 13, color: '#a3a3a3', marginBottom: 8, textAlign: 'center' }}>
              Your video will be published on Instagram with the caption provided.
            </div>
            <div className="modal-actions">
              <button
                onClick={confirmInstagramExport}
                disabled={igLoading}
                className="modal-btn modal-btn-primary"
              >
                {igLoading ? 'Exporting...' : 'Confirm export'}
              </button>
              <button
                onClick={() => setShowInstagramModal(false)}
                disabled={igLoading}
                className="modal-btn modal-btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}