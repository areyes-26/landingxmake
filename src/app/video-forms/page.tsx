'use client';

import { useState, type FormEvent, type ChangeEvent, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Bell, PlayCircle, PauseCircle, Check } from "lucide-react";
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { HeyGenVoice } from '@/lib/heygen';
import GroupedAvatarsDropdown from '@/components/ui/GroupedAvatarsDropdown';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCreditValidator } from '@/hooks/useCreditValidator';
import { calculateCreditCost, type VideoOptions } from '@/lib/creditPricing';
import './styles.css';

interface AvatarOption {
  id: string;
  name: string;
  imageUrl: string;
  dataAiHint: string;
}

interface AvatarGroup {
  title: string;
  options: AvatarOption[];
}

interface FormData {
  videoTitle: string;
  description: string;
  topic: string;
  avatarId: string;
  callToAction: string;
  specificCallToAction: string;
  tone: string;
  email: string;
  duration: string;
  voiceId: string;
  voiceDetails?: {
    name: string;
    language: string;
    gender: string;
    preview_url?: string;
  };
}

interface Step {
  title: string;
  isValid: boolean;
  fields: string[];
}

const STEPS: Step[] = [
  {
    title: "Detalles básicos",
    isValid: false,
    fields: ["videoTitle", "description", "duration"]
  },
  {
    title: "Llamado a la acción",
    isValid: false,
    fields: ["callToAction", "specificCallToAction"]
  },
  {
    title: "Últimos detalles del video",
    isValid: false,
    fields: ["topic", "email", "tone", "avatarId"]
  }
];

const CALL_TO_ACTION_OPTIONS = [
  { value: 'Visita nuestro sitio web', label: 'Visita nuestro sitio web', icon: '🌐' },
  { value: 'Suscríbete ahora', label: 'Suscríbete ahora', icon: '🔔' },
  { value: 'Comparte con tus amigos', label: 'Comparte con tus amigos', icon: '📱' },
  { value: 'Descarga nuestra app', label: 'Descarga nuestra app', icon: '📱' }
] as const;

const TONE_OPTIONS = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'casual', label: 'Casual' },
  { value: 'entusiasta', label: 'Entusiasta' },
  { value: 'humoristico', label: 'Humorístico' },
  { value: 'inspirador', label: 'Inspirador' }
] as const;

const DURATION_LIMITS = {
  '30s': { label: '30 segundos', limit: 100 },
  '1min': { label: '1 minuto', limit: 300 },
  '1.5min': { label: '1:30 minutos', limit: 600 },
};

export default function VideoFormsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  const handleLogout = async () => {
    try {
      await fetch('/api/sessionLogout', { method: 'POST' });
      await signOut(auth);
      toast.success('Sesión cerrada exitosamente');
      router.push('/inicio');
      router.refresh();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };
  const [formData, setFormData] = useState<FormData>({
    videoTitle: '',
    description: '',
    topic: '',
    avatarId: '',
    callToAction: '',
    specificCallToAction: '',
    tone: '',
    email: '',
    duration: '30s',
    voiceId: '',
  });

  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const [avatarOptions, setAvatarOptions] = useState<AvatarOption[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [voices, setVoices] = useState<HeyGenVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const voiceDropdownRef = useRef<HTMLDivElement>(null);
  const [isToneDropdownOpen, setIsToneDropdownOpen] = useState(false);
  const toneDropdownRef = useRef<HTMLDivElement>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Credit validation hook
  const { 
    userCredits: creditsUserCredits, 
    loading: creditsLoading, 
    validateVideo, 
    canAfford: creditsCanAfford, 
    warning: creditsWarning 
  } = useCreditValidator();

  // Calculate current video cost
  const currentVideoOptions: VideoOptions = {
    duration: formData.duration,
    avatarId: formData.avatarId,
    voiceId: formData.voiceId,
    callToAction: formData.callToAction,
    specificCallToAction: formData.specificCallToAction
  };

  const currentCost = calculateCreditCost(currentVideoOptions);
  const canAffordCurrent = creditsCanAfford(currentVideoOptions);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Enviando...');

    try {
      if (!formData.avatarId) {
        setStatus('Por favor selecciona un avatar');
        setIsLoading(false);
        return;
      }

      if (!formData.voiceId) {
        setStatus('Por favor selecciona una voz');
        setIsLoading(false);
        return;
      }

      console.log('Enviando datos:', formData);

      const user = auth.currentUser;
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('Respuesta del servidor:', data);

      if (!response.ok) {
        if (response.status === 403 && data.error === 'Not enough credits') {
          setStatus(`No tienes créditos suficientes para crear este video. Créditos requeridos: ${data.required}, tus créditos: ${data.current}`);
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || data.details || 'Error al procesar la solicitud');
      }

      setStatus('¡Video creado exitosamente!');
      router.push(`/videos/${data.firestoreId}`);

    } catch (error) {
      console.error('Error completo:', error);
      setStatus(error instanceof Error ? error.message : 'Error al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  // Efectos para cargar datos
  useEffect(() => {
    const fetchAvatarsData = async () => {
      try {
        setLoadingAvatars(true);
        const response = await fetch('/api/avatars', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          
          const apiAvatars = data.data.avatars || [];
          const apiTalkingPhotos = data.data.talking_photos || [];

          const formattedAvatars: AvatarOption[] = apiAvatars.map((avatar: any) => ({
            id: avatar.avatar_id,
            name: avatar.avatar_name,
            imageUrl: avatar.preview_image_url,
            dataAiHint: 'avatar-image'
          }));

          const formattedTalkingPhotos: AvatarOption[] = apiTalkingPhotos.map((photo: any) => ({
            id: photo.talking_photo_id,
            name: photo.talking_photo_name,
            imageUrl: photo.preview_image_url,
            dataAiHint: 'avatar-image'
          }));
          
          setAvatarOptions([...formattedAvatars, ...formattedTalkingPhotos]);
        } else {
            toast.error("Error al cargar los avatares.");
            console.error("Failed to fetch avatars");
        }
      } catch (error) {
        console.error('Error fetching avatars:', error);
        toast.error("Hubo un problema al cargar los avatares.");
      } finally {
        setLoadingAvatars(false);
      }
    };

    const fetchVoices = async () => {
      try {
        setLoadingVoices(true);
        const response = await fetch('/api/voices');
        if (response.ok) {
          const data = await response.json();
          setVoices(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching voices:', error);
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchAvatarsData();
    fetchVoices();
  }, []);

  const handleAvatarSelect = (avatar: AvatarOption) => {
    setSelectedAvatar(avatar);
    setFormData(prev => ({ ...prev, avatarId: avatar.id }));
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    const selectedVoice = voices.find(v => v.id === value);
    setFormData(prev => ({ 
      ...prev, 
      voiceId: value,
      voiceDetails: selectedVoice ? {
        name: selectedVoice.name,
        language: selectedVoice.language,
        gender: selectedVoice.gender,
        preview_url: selectedVoice.preview_url
      } : undefined
    }));
  };

  const handleSelectVoice = (voice: HeyGenVoice) => {
    setFormData(prev => ({ 
      ...prev, 
      voiceId: voice.id,
      voiceDetails: {
        name: voice.name,
        language: voice.language,
        gender: voice.gender,
        preview_url: voice.preview_url
      }
    }));
    setIsVoiceDropdownOpen(false);
  };

  const handleSelectTone = (tone: { value: string; label: string }) => {
    setFormData(prev => ({ ...prev, tone: tone.value }));
    setIsToneDropdownOpen(false);
  };

  const handlePreviewVoice = (e: React.MouseEvent, voice: HeyGenVoice) => {
    e.stopPropagation();
    if (audioRef.current) {
        if (currentlyPlaying === voice.id) {
            audioRef.current.pause();
            setCurrentlyPlaying(null);
        } else {
            audioRef.current.src = voice.preview_url || '';
            audioRef.current.play();
            setCurrentlyPlaying(voice.id);
        }
    }
  };

  const handleDurationChange = (duration: string) => {
    setFormData(prev => ({ ...prev, duration }));
  };

  const handleCallToActionChange = (cta: string) => {
    setFormData(prev => ({ ...prev, callToAction: cta }));
  };

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Cerrar el dropdown de notificaciones si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen]);

  // Cerrar el dropdown de voz si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (voiceDropdownRef.current && !voiceDropdownRef.current.contains(event.target as Node)) {
        setIsVoiceDropdownOpen(false);
      }
    }
    if (isVoiceDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVoiceDropdownOpen]);

  // Cerrar el dropdown de tono si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toneDropdownRef.current && !toneDropdownRef.current.contains(event.target as Node)) {
        setIsToneDropdownOpen(false);
      }
    }
    if (isToneDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToneDropdownOpen]);

  return (
    <div className="video-forms-container">
      <audio ref={audioRef} onEnded={() => setCurrentlyPlaying(null)} />
      <div className="video-forms-main-container">
        {/* Form Header */}
        <div className="video-forms-form-header">
          <h1 className="video-forms-form-title">Crear Video</h1>
          <p className="video-forms-form-subtitle">
            Comparte tu historia con el mundo. Completa el formulario para crear tu video con IA.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="video-forms-progress-container">
          <div className="video-forms-progress-steps">
            {STEPS.map((step, index) => (
              <div
                key={index}
                className={`video-forms-step ${index === currentStep ? 'active' : index < currentStep ? 'completed' : ''}`}
              >
                <div className="video-forms-step-number">{index + 1}</div>
                <span className="video-forms-step-text">{step.title}</span>
              </div>
            ))}
          </div>
          <div className="video-forms-progress-bar">
            <div 
              className="video-forms-progress-fill" 
              style={{ width: `${((currentStep) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container */}
        <div className="video-forms-form-container">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Details */}
            <div className={`video-forms-form-step ${currentStep === 0 ? 'active' : ''}`}>
              <div className="video-forms-form-group">
                <label className="video-forms-form-label">Duración del video</label>
                <p className="video-forms-form-description">
                  Selecciona la duración que mejor se adapte a tu contenido
                </p>
                <div className="video-forms-duration-options">
                  {Object.entries(DURATION_LIMITS).map(([key, value]) => (
                    <div
                      key={key}
                      onClick={() => handleDurationChange(key)}
                      className={`video-forms-duration-option ${formData.duration === key ? 'selected' : ''}`}
                    >
                      <div className="video-forms-duration-time">{value.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="video-forms-form-group">
                <label htmlFor="videoTitle" className="video-forms-form-label">
                  Título del video
                </label>
                <input
                  type="text"
                  id="videoTitle"
                  name="videoTitle"
                  value={formData.videoTitle}
                  onChange={handleChange}
                  className="video-forms-input"
                  placeholder="Escribe un título atractivo para tu video"
                  required
                />
              </div>

              <div className="video-forms-form-group">
                <label htmlFor="description" className="video-forms-form-label">
                  Descripción del video
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="video-forms-textarea"
                  placeholder="Escribe una descripción detallada del video"
                  maxLength={600}
                />
                <div className="video-forms-char-counter">
                  {formData.description.length}/600 caracteres
                </div>
              </div>
            </div>

            {/* Step 2: Call to Action */}
            <div className={`video-forms-form-step ${currentStep === 1 ? 'active' : ''}`}>
              <div className="video-forms-form-group">
                <label className="video-forms-form-label">Llamado a la acción</label>
                <p className="video-forms-form-description">
                  Selecciona qué acción quieres que realicen los espectadores
                </p>
                <div className="video-forms-cta-options">
                  {CALL_TO_ACTION_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      onClick={() => handleCallToActionChange(option.value)}
                      className={`video-forms-cta-option ${formData.callToAction === option.value ? 'selected' : ''}`}
                    >
                      <span className="video-forms-cta-icon">{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="video-forms-form-group">
                <label htmlFor="specificCallToAction" className="video-forms-form-label">
                  Texto personalizado del CTA
                </label>
                <p className="video-forms-form-description">
                  Personaliza el mensaje de tu llamado a la acción
                </p>
                <textarea
                  id="specificCallToAction"
                  name="specificCallToAction"
                  value={formData.specificCallToAction}
                  onChange={handleChange}
                  className="video-forms-textarea"
                  placeholder="Escribe aquí tu mensaje personalizado..."
                  rows={4}
                />
              </div>
            </div>

            {/* Step 3: Final Details */}
            <div className={`video-forms-form-step ${currentStep === 2 ? 'active' : ''}`}>
              <div className="video-forms-form-group">
                <label htmlFor="topic" className="video-forms-form-label">
                  Tema principal
                </label>
                <p className="video-forms-form-description">
                  Describe de qué quieres que trate tu video
                </p>
                <textarea
                  id="topic"
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  className="video-forms-textarea"
                  placeholder="Ejemplo: Quiero que trate sobre el mundial de clubes"
                  maxLength={500}
                />
                <div className="video-forms-char-counter">
                  {formData.topic.length}/500 caracteres
                </div>
              </div>

              <div className="video-forms-form-group">
                <label htmlFor="tone" className="video-forms-form-label">Tono</label>
                <div className="relative" ref={toneDropdownRef}>
                  <button
                    type="button"
                    className="voice-select text-left"
                    onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
                  >
                    {TONE_OPTIONS.find(o => o.value === formData.tone)?.label || 'Selecciona un tono'}
                  </button>
                  {isToneDropdownOpen && (
                    <div className="voice-options-container">
                      {TONE_OPTIONS.map(option => (
                        <div
                          key={option.value}
                          className="voice-option"
                          onClick={() => handleSelectTone(option)}
                        >
                          <span className="voice-option-text">{option.label}</span>
                          {formData.tone === option.value && <Check className="w-4 h-4 text-sky-400" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="video-forms-form-group">
                <label htmlFor="voiceId" className="video-forms-form-label">Voz</label>
                <div className="relative" ref={voiceDropdownRef}>
                  <button
                    type="button"
                    className="voice-select text-left"
                    onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                  >
                    {formData.voiceDetails ? `${formData.voiceDetails.name} - ${formData.voiceDetails.language}` : 'Selecciona una voz'}
                  </button>
                  {isVoiceDropdownOpen && (
                    <div className="voice-options-container">
                      {voices.map(voice => (
                        <div
                          key={voice.id}
                          className="voice-option"
                          onClick={() => handleSelectVoice(voice)}
                        >
                          <span className="voice-option-text">{voice.name} - {voice.language}</span>
                          {voice.preview_url && (
                            <button
                              type="button"
                              className="voice-preview-button"
                              onClick={(e) => handlePreviewVoice(e, voice)}
                            >
                              {currentlyPlaying === voice.id ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="video-forms-form-group">
                <label className="video-forms-form-label">Avatar</label>
                 {loadingAvatars ? (
                  <p>Cargando avatares...</p>
                ) : (
                  <GroupedAvatarsDropdown
                    avatarGroups={[{ title: 'Avatares Disponibles', options: avatarOptions }]}
                    selectedAvatarId={selectedAvatar?.id || null}
                    onSelect={handleAvatarSelect}
                  />
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="video-forms-navigation">
              <div className="video-forms-credits-info">
                <div className="video-forms-credits-icon">💎</div>
                <span>{currentCost} créditos</span>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="video-forms-nav-button video-forms-nav-button-secondary"
                  >
                    ← Atrás
                  </button>
                )}
                
                {currentStep < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={isLoading || !canAffordCurrent}
                    className="video-forms-nav-button video-forms-nav-button-primary"
                  >
                    Siguiente →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading || !canAffordCurrent}
                    className="video-forms-nav-button video-forms-nav-button-primary"
                  >
                    {isLoading ? 'Enviando...' : '🚀 Crear Video'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Status Message */}
        {status && (
          <div className="video-forms-status">
            <p className={`video-forms-status-message ${
              status?.startsWith('Error') || status?.startsWith('Error de conexión') 
                ? 'error' 
                : 'success'
            }`}>
              {status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 