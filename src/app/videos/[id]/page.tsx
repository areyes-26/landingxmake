'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { VideoData } from '@/types/video';
import './video-preview.css';

export default function VideoSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
  const [isRegeneratingSocial, setIsRegeneratingSocial] = useState(false);
  const [isRegeneratingScript, setIsRegeneratingScript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoSettings, setVideoSettings] = useState<VideoData | null>(null);
  const [activeTab, setActiveTab] = useState('script');
  const [scriptCharCount, setScriptCharCount] = useState(0);
  const [shortCopyCharCount, setShortCopyCharCount] = useState(0);
  const [longCopyCharCount, setLongCopyCharCount] = useState(0);

  useEffect(() => {
    if (params.id) {
      fetchVideoSettings(params.id as string);
    } else {
      setIsLoading(false);
      setError('Video ID not found.');
    }
  }, [params.id]);

  useEffect(() => {
    if (videoSettings) {
      setScriptCharCount(videoSettings.script?.length || 0);
      setShortCopyCharCount(videoSettings.shortCopy?.length || 0);
      setLongCopyCharCount(videoSettings.longCopy?.length || 0);
    }
  }, [videoSettings]);

  useEffect(() => {
    if (videoSettings?.status === 'draft') {
      const step = videoSettings.currentStep || 0;
      router.replace(`/video-forms?id=${params.id}&step=${step}`);
    }
  }, [videoSettings, params.id, router]);

  const fetchVideoSettings = async (videoId: string) => {
    try {
      setIsLoading(true);
      const videoRef = doc(db, 'videos', videoId);
      const videoDoc = await getDoc(videoRef);
      if (!videoDoc.exists()) {
        setError('Video not found.');
        return;
      }
      const data = videoDoc.data() as VideoData;
      
      const completionRef = doc(db, 'completion_results_videos', videoId);
      const completionDoc = await getDoc(completionRef);
      if (completionDoc.exists()) {
        const completionData = completionDoc.data();
        data.script = completionData.script || data.script;
        data.shortCopy = completionData.shortCopy || data.shortCopy;
        data.longCopy = completionData.longCopy || data.longCopy;
      }
      setVideoSettings(data);
    } catch (error) {
      console.error('Error fetching video settings:', error);
      setError('Error loading video settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!videoSettings) return;
    setIsSaving(true);
    try {
      const isFormComplete = videoSettings.script && videoSettings.videoTitle && videoSettings.voiceId && videoSettings.avatarId;
      const videoRef = doc(db, 'videos', params.id as string);
      await setDoc(videoRef, {
        videoTitle: videoSettings.videoTitle,
        status: isFormComplete ? 'processing' : 'draft',
        updatedAt: serverTimestamp()
      }, { merge: true });

      const completionRef = doc(db, 'completion_results_videos', params.id as string);
      await setDoc(completionRef, {
        script: videoSettings.script,
        shortCopy: videoSettings.shortCopy,
        longCopy: videoSettings.longCopy,
        updatedAt: serverTimestamp()
      }, { merge: true });

      if (isFormComplete) {
        const response = await fetch('/api/heygen/generate-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: params.id, ...videoSettings }),
        });
        if (!response.ok) throw new Error('Error initiating video generation.');
        toast.success('Changes saved successfully');
        router.push(`/videos/${params.id}/generating`);
      } else {
        toast.success('Draft saved successfully');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error saving changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerateTitle = async () => {
    if (!videoSettings) return;
    setIsRegeneratingTitle(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/openai/generate-title', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          originalTitle: videoSettings.videoTitle,
          topic: videoSettings.topic,
          description: videoSettings.description,
          tone: videoSettings.tone,
          videoId: params.id
        }),
      });
      if (!response.ok) throw new Error('Error regenerating title');
      const data = await response.json();
      setVideoSettings(prev => prev ? { ...prev, videoTitle: data.title } : null);
      toast.success('Title regenerated successfully');
    } catch (error) {
      toast.error('Error regenerating title');
      console.error('Error:', error);
    } finally {
      setIsRegeneratingTitle(false);
    }
  };

  const handleRegenerateScript = async () => {
    if (!videoSettings) return;
    setIsRegeneratingScript(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/openai/generate-script', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          generationId: params.id,
          videoData: {
            duration: videoSettings.duration,
            tone: videoSettings.tone,
            topic: videoSettings.topic,
            description: videoSettings.description,
            videoTitle: videoSettings.videoTitle
          }
        }),
      });
      if (!response.ok) throw new Error('Error regenerating script');
      const data = await response.json();
      setVideoSettings(prev => prev ? { ...prev, script: data.script } : null);
      toast.success('Script regenerated successfully');
    } catch (error) {
      toast.error('Error regenerating script');
      console.error('Error:', error);
    } finally {
      setIsRegeneratingScript(false);
    }
  };

  const handleRegenerateSocial = async () => {
    if (!videoSettings?.script) return;
    setIsRegeneratingSocial(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/openai/generate-social-copy', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ script: videoSettings.script }),
      });
      if (!response.ok) {
        throw new Error('Error regenerating social content');
      }
      const data = await response.json();
      setVideoSettings(prev => prev ? {
        ...prev,
        shortCopy: data.shortCopy,
        longCopy: data.longCopy
      } : null);
      toast.success('Social content regenerated successfully');
    } catch (error) {
      toast.error('Error regenerating social content');
      console.error('Error:', error);
    } finally {
      setIsRegeneratingSocial(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0c0d1f]">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0c0d1f]">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!videoSettings) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0c0d1f]">
        <div className="text-white">Video data could not be loaded.</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Video Preview</h1>
        <button className="save-btn" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="section title-section">
        <h2 className="section-title">Video Title</h2>
        <div className="title-input-group">
          <input
            type="text"
            className="video-title-input"
            value={videoSettings?.videoTitle || ''}
            onChange={(e) => setVideoSettings(prev => prev ? { ...prev, videoTitle: e.target.value } : null)}
            placeholder="Enter your video title"
          />
        </div>
        <button className="regenerate-btn" onClick={handleRegenerateTitle} disabled={isRegeneratingTitle}>
          {isRegeneratingTitle ? '🤖 Regenerating...' : '🤖 Regenerate with AI'}
        </button>
        <div className="regenerate-hint">You can edit the title manually or ask AI to regenerate it.</div>
      </div>

      <div className="section">
        <h2 className="section-title">Generated Content</h2>
        <div className="content-tabs">
          <div className="tab-buttons">
            <button className={`tab-btn ${activeTab === 'script' ? 'active' : ''}`} onClick={() => setActiveTab('script')}>Script</button>
            <button className={`tab-btn ${activeTab === 'social' ? 'active' : ''}`} onClick={() => setActiveTab('social')}>Social Content</button>
          </div>

          <div className={`tab-content ${activeTab === 'script' ? 'active' : ''}`}>
            <div className="content-header">
              <h3 className="content-type-title">Generated Script</h3>
              <button className="regenerate-content-btn" onClick={handleRegenerateScript} disabled={isRegeneratingScript}>
                {isRegeneratingScript ? '🤖 Regenerating...' : '🤖 Regenerate Script'}
              </button>
            </div>
            <div className="content-textarea-container">
              <textarea
                className="content-textarea"
                value={videoSettings?.script || ''}
                onChange={(e) => {
                  setVideoSettings(prev => prev ? { ...prev, script: e.target.value } : null);
                  setScriptCharCount(e.target.value.length);
                }}
                placeholder="Your generated script will appear here..."
              />
            </div>
          </div>

          <div className={`tab-content ${activeTab === 'social' ? 'active' : ''}`}>
            <div className="content-header">
              <h3 className="content-type-title">Social Media Content</h3>
              <button className="regenerate-content-btn" onClick={handleRegenerateSocial} disabled={isRegeneratingSocial}>
                {isRegeneratingSocial ? '🤖 Regenerating...' : '🤖 Regenerate Content'}
              </button>
            </div>
            <div className="copy-section">
              <h4 className="copy-title">Short Copy</h4>
              <textarea
                className="content-textarea short-copy"
                value={typeof videoSettings?.shortCopy === 'object' ? (videoSettings.shortCopy as any)?.content || '' : videoSettings?.shortCopy || ''}
                onChange={(e) => setVideoSettings(prev => prev ? { ...prev, shortCopy: e.target.value } : null)}
                placeholder="Short copy for social media..."
              />
            </div>
            <div className="copy-section">
              <h4 className="copy-title">Long Copy</h4>
              <textarea
                className="content-textarea long-copy"
                value={typeof videoSettings?.longCopy === 'object' ? (videoSettings.longCopy as any)?.content || '' : videoSettings?.longCopy || ''}
                onChange={(e) => setVideoSettings(prev => prev ? { ...prev, longCopy: e.target.value } : null)}
                placeholder="Long copy for social media..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 