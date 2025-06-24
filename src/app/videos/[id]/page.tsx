'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { doc, setDoc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { VideoData } from '@/types/video';
import './video-preview.css';

const pollingIntervalMs = 2000;
const maxPollingTimeMs = 60000; // 1 minuto máximo

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
  const [showContent, setShowContent] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAndMaybePoll() {
      await fetchVideoSettings(params.id as string);
      // Si no hay completion, iniciar polling
      if (!hasCompletionFields(videoSettings)) {
        pollingStartTimeRef.current = Date.now();
        pollingRef.current = setInterval(async () => {
          if (cancelled) return;
          await fetchVideoSettings(params.id as string);
        }, pollingIntervalMs);
      }
    }
    if (params.id) {
      fetchAndMaybePoll();
    }
    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [params.id]);

  // Nuevo efecto: detener polling cuando los datos estén completos
  useEffect(() => {
    if (hasCompletionFields(videoSettings) && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [videoSettings]);

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

  useEffect(() => {
    function getCopyValue(copy: any) {
      if (!copy) return '';
      if (typeof copy === 'string') return copy;
      if (typeof copy === 'object' && 'content' in copy) return copy.content;
      return '';
    }
    const hasScript = !!getCopyValue(videoSettings?.script);
    const hasShortCopy = !!getCopyValue(videoSettings?.shortCopy);
    const hasLongCopy = !!getCopyValue(videoSettings?.longCopy);

    console.log('Check showContent:', { hasScript, hasShortCopy, hasLongCopy, videoSettings });

    if (hasScript && hasShortCopy && hasLongCopy) {
      setShowContent(true);
    } else {
      setShowContent(false);
    }
  }, [videoSettings]);

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
      console.log('Video doc:', data);
      
      const completionRef = doc(db, 'completion_results_videos', videoId);
      const completionDoc = await getDoc(completionRef);
      if (completionDoc.exists()) {
        const completionData = completionDoc.data();
        console.log('Completion doc:', completionData);
        data.script = completionData.script || data.script;
        data.shortCopy = completionData.shortCopy || data.shortCopy;
        data.longCopy = completionData.longCopy || data.longCopy;
      } else {
        console.log('No completion doc found');
      }
      setVideoSettings(data);
      console.log('Set videoSettings:', data);
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

  function hasCompletionFields(settings: any) {
    function getCopyValue(copy: any) {
      if (!copy) return '';
      if (typeof copy === 'string') return copy;
      if (typeof copy === 'object' && 'content' in copy) return copy.content;
      return '';
    }
    return !!(settings && getCopyValue(settings.script) && getCopyValue(settings.shortCopy) && getCopyValue(settings.longCopy));
  }

  if (isLoading || !showContent) {
    return (
      <div className="generating-modern-bg">
        <div className="generating-modern-center">
          <div className="generating-modern-spinner" />
          <div className="generating-modern-title">Generating your video content...</div>
          <div className="generating-modern-sub">This may take a few seconds. Please wait while we prepare your script and social content.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Video Preview</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {videoSettings && videoSettings.script && videoSettings.shortCopy && videoSettings.longCopy && !showContent && (
            <button
              className="reload-btn"
              onClick={() => fetchVideoSettings(params.id as string)}
              style={{ background: 'linear-gradient(90deg, #0ea5e9, #7c3aed)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1.25rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(14,165,233,0.15)' }}
            >
              ⟳ Reload
            </button>
          )}
          <button className="save-btn" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
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