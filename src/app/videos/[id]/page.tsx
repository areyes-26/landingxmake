'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { doc, setDoc, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { VideoData } from '@/types/video';
import './video-preview.css';
import '../../video-forms/styles.css';
// Importa los templates de Creatomate
import { proTemplate } from '@/lib/creatomate/templates/proTemplate';
import { proTemplateV2 } from '@/lib/creatomate/templates/proTemplate';
import { basicTemplate } from '@/lib/creatomate/templates/basicTemplate';
import { freeTemplate } from '@/lib/creatomate/templates/freeTemplate';

const STEPS = [
  { title: 'Description' },
  { title: 'Social Content' },
  { title: 'Templates' },
];

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
  // Nuevo estado para el stepper y template seleccionado
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

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
        selectedTemplate: selectedTemplate, // Guardar el template seleccionado
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
          body: JSON.stringify({ 
            videoId: params.id, 
            ...videoSettings,
            selectedTemplate: selectedTemplate // Enviar el template seleccionado
          }),
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

  // Determinar templates según plan (puedes ajustar la lógica según tu backend)
  const templates = [proTemplate, proTemplateV2]; // Añadir la nueva plantilla

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
    <div className="video-forms-container flex flex-col items-center justify-center min-h-screen">
      <div className="video-forms-main-container" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 className="video-forms-form-title" style={{ textAlign: 'center', marginBottom: 30, marginTop: 24 }}>Video Preview</h1>
        {/* Stepper de 2 pasos: Creation/Edition (estilos locales) */}
        <div className="video-preview-switch-stepper" style={{ marginBottom: 0, justifyContent: 'center' }}>
          <div className="video-preview-switch-slider">
            <div className="video-preview-switch-track">
              <div className="video-preview-switch-knob"></div>
              <div className="video-preview-switch-label creation-label">Creation</div>
              <div className="video-preview-switch-label edition-label active">Edition</div>
            </div>
          </div>
        </div>
        <p className="video-forms-form-subtitle" style={{ textAlign: 'center', marginTop: 50, marginBottom: 32, color: '#b3b3b3', fontSize: '1.08rem', fontWeight: 500 }}>
          Here you can review the script your avatar will use, see the generated copy, and choose a template for your video edition.
        </p>
        <div className="video-forms-stepper-pill-row">
          {STEPS.map((step, idx) => {
            const isFilled = idx <= currentStep;
            const pillClass =
              'video-forms-stepper-pill' +
              (isFilled ? ' completed' : '');
            const numberClass =
              'video-forms-stepper-pill-number' +
              (isFilled ? ' filled' : '');
            const isClickable = idx < currentStep;
            return (
              <div
                key={step.title}
                className={pillClass + (isClickable ? ' clickable' : '')}
                style={{
                  borderTopLeftRadius: idx === 0 ? '16px' : 0,
                  borderTopRightRadius: idx === STEPS.length - 1 ? '16px' : 0,
                  cursor: isClickable ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (isClickable) setCurrentStep(idx);
                }}
              >
                <span className={numberClass}>{idx + 1}</span>
                <span className="video-forms-stepper-pill-label">{step.title}</span>
              </div>
            );
          })}
        </div>
        <div className="video-forms-form-container" style={{ marginTop: 0, position: 'relative', width: '100%', height: 'auto' }}>
          {/* Paso 1: Description */}
          {currentStep === 0 && (
            <div className="video-forms-form-step active" style={{ paddingBottom: 0 }}>
              <div className="video-forms-form-group" style={{ marginBottom: 18 }}>
                <label className="video-forms-form-label">Title</label>
                <input
                  type="text"
                  className="video-forms-input"
                  value={videoSettings?.videoTitle || ''}
                  onChange={(e) => setVideoSettings(prev => prev ? { ...prev, videoTitle: e.target.value } : null)}
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                  placeholder="Enter your video title..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                <button
                  className="regenerate-btn"
                  onClick={handleRegenerateTitle}
                  disabled={isRegeneratingTitle}
                  style={{ minWidth: 180 }}
                >
                  {isRegeneratingTitle ? '🤖 Regenerating...' : 'Regenerate Title'}
                </button>
              </div>
              {/* Divider inside the panel */}
              <div style={{ width: '100%', height: 1, background: 'rgba(124,58,237,0.13)', margin: '18px 0 24px 0' }} />
              <div className="video-forms-form-group" style={{ marginBottom: 0 }}>
                <label className="video-forms-form-label">Script</label>
                <textarea
                  className="video-forms-textarea"
                  value={videoSettings?.script || ''}
                  readOnly
                  style={{ 
                    background: 'rgba(255,255,255,0.04)', 
                    minHeight: 320,
                    resize: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, marginTop: 8 }}>
                <button
                  className="regenerate-btn"
                  onClick={handleRegenerateScript}
                  disabled={isRegeneratingScript}
                  style={{ minWidth: 180 }}
                >
                  {isRegeneratingScript ? '🤖 Regenerating...' : 'Regenerate Script'}
                </button>
              </div>
              {/* Navigation buttons bottom inside the panel */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="video-forms-nav-button video-forms-nav-button-primary"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {/* Paso 2: Social Content */}
          {currentStep === 1 && (
            <div className="video-forms-form-step active" style={{ paddingBottom: 0 }}>
              <div className="video-forms-form-group">
                <label className="video-forms-form-label">
                  Short Copy
                  <span className="relative group cursor-pointer ml-1 align-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-help w-4 h-4 align-middle" style={{ position: 'relative', top: '-2px' }}><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-[#23243a] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg pointer-events-none text-center">
                      El "Short Copy" es un texto breve y llamativo para redes sociales, ideal para captar la atención rápidamente.
                    </span>
                  </span>
                </label>
                <textarea
                  className="video-forms-textarea"
                  value={typeof videoSettings?.shortCopy === 'object' ? (videoSettings.shortCopy as any)?.content || '' : videoSettings?.shortCopy || ''}
                  readOnly
                  style={{ 
                    background: 'rgba(255,255,255,0.04)', 
                    width: 520.88, 
                    height: 200,
                    resize: 'none'
                  }}
                />
              </div>
              <div className="video-forms-form-group">
                <label className="video-forms-form-label">
                  Long Copy
                  <span className="relative group cursor-pointer ml-1 align-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-help w-4 h-4 align-middle" style={{ position: 'relative', top: '-2px' }}><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 bg-[#23243a] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg pointer-events-none text-center">
                      El "Long Copy" es un texto más extenso y descriptivo para redes sociales, ideal para explicar detalles o motivar a la acción.
                    </span>
                  </span>
                </label>
                <textarea
                  className="video-forms-textarea"
                  value={typeof videoSettings?.longCopy === 'object' ? (videoSettings.longCopy as any)?.content || '' : videoSettings?.longCopy || ''}
                  readOnly
                  style={{ 
                    background: 'rgba(255,255,255,0.04)', 
                    width: 520.88, 
                    height: 200,
                    resize: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, marginTop: 8 }}>
                <button
                  className="regenerate-btn"
                  onClick={handleRegenerateSocial}
                  disabled={isRegeneratingSocial}
                  style={{ minWidth: 180 }}
                >
                  {isRegeneratingSocial ? '🤖 Regenerating...' : 'Regenerate Copy'}
                </button>
              </div>
              {/* Navigation buttons bottom inside the panel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="video-forms-nav-button video-forms-nav-button-secondary"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="video-forms-nav-button video-forms-nav-button-primary"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          {/* Paso 3: Video Templates */}
          {currentStep === 2 && (
            <div className="video-forms-form-step active" style={{ paddingBottom: 0 }}>
              <div className="video-forms-form-group">
                <label className="video-forms-form-label">
                  Select a Template
                  <span className="relative group cursor-pointer ml-1 align-middle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-help w-4 h-4 align-middle" style={{ position: 'relative', top: '-2px' }}><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
                    <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 bg-[#23243a] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg pointer-events-none text-center">
                      Elige un template de edición para personalizar el estilo visual y animaciones de tu video final.
                    </span>
                  </span>
                </label>
                <div className="template-cards-container" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 16 }}>
                  {templates.map((template: any) => (
                    <div
                      key={template.templateId || template.id || 'main-template'}
                      className={`template-card${selectedTemplate === (template.templateId || template.id || 'main-template') ? ' selected' : ''}`}
                      style={{
                        border: selectedTemplate === (template.templateId || template.id || 'main-template') ? '2px solid #7c3aed' : '1.5px solid rgba(124,58,237,0.18)',
                        borderRadius: 16,
                        background: '#191a2e',
                        padding: 16,
                        cursor: 'pointer',
                        minWidth: 180,
                        maxWidth: 220,
                        flex: '1 1 180px',
                        boxShadow: selectedTemplate === (template.templateId || template.id || 'main-template') ? '0 2px 16px #7c3aed33' : 'none',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                      onClick={() => setSelectedTemplate(template.templateId || template.id || 'main-template')}
                    >
                      {/* Si tienes una imagen de preview, muéstrala. Si no, muestra un placeholder */}
                      {template.previewUrl ? (
                        <img src={template.previewUrl} alt={template.name || 'Template'} style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />
                      ) : (
                        <div style={{ width: '100%', height: 100, background: 'linear-gradient(135deg, #0ea5e9, #7c3aed)', borderRadius: 12, marginBottom: 12 }} />
                      )}
                      <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>{template.name || 'Main Template'}</div>
                      <div style={{ fontSize: 13, color: '#b3b3b3', textAlign: 'center' }}>{template.description || 'Default video template.'}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Navigation buttons bottom inside the panel */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep - 1)}
                  className="video-forms-nav-button video-forms-nav-button-secondary"
                >
                  ← Back
                </button>
                <button
                  className="video-forms-nav-button video-forms-nav-button-primary"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Create video'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 