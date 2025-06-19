'use client';

import { useState, type FormEvent, type ChangeEvent, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Bell } from "lucide-react";
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
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);
  const [avatarGroups, setAvatarGroups] = useState<AvatarGroup[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);
  const [avatarGroupList, setAvatarGroupList] = useState<{id:string,name:string}[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [avatarsByGroup, setAvatarsByGroup] = useState<AvatarOption[]>([]);
  const [voices, setVoices] = useState<HeyGenVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);

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
    const fetchAvatars = async () => {
      try {
        setLoadingAvatars(true);
        const response = await fetch('/api/avatars-by-group');
        if (response.ok) {
          const data = await response.json();
          setAvatarGroupList(data.groups);
          if (data.groups.length > 0) {
            setSelectedGroupId(data.groups[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching avatar groups:', error);
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

    fetchAvatars();
    fetchVoices();
  }, []);

  useEffect(() => {
    const fetchAvatarsByGroup = async () => {
      if (!selectedGroupId) return;
      
      try {
        const response = await fetch(`/api/avatars-by-group?groupId=${selectedGroupId}`);
        if (response.ok) {
          const data = await response.json();
          setAvatarsByGroup(data.avatars);
        }
      } catch (error) {
        console.error('Error fetching avatars by group:', error);
      }
    };

    fetchAvatarsByGroup();
  }, [selectedGroupId]);

  const handleAvatarSelect = (avatar: AvatarOption) => {
    setSelectedAvatar(avatar);
    setFormData(prev => ({ ...prev, avatarId: avatar.id }));
    setIsAvatarDropdownOpen(false);
  };

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceId = e.target.value;
    const selectedVoice = voices.find(voice => voice.id === voiceId);
    
    setFormData(prev => ({
      ...prev,
      voiceId,
      voiceDetails: selectedVoice ? {
        name: selectedVoice.name,
        language: selectedVoice.language,
        gender: selectedVoice.gender,
        preview_url: selectedVoice.preview_url
      } : undefined
    }));
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

  return (
    <div className="video-forms-container">
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
                <label htmlFor="voiceId" className="video-forms-form-label">
                  Voz
                </label>
                <select
                  id="voiceId"
                  name="voiceId"
                  value={formData.voiceId}
                  onChange={handleVoiceChange}
                  className="video-forms-select"
                  required
                >
                  <option value="">Selecciona una voz</option>
                  {Array.isArray(voices) && voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.language}
                    </option>
                  ))}
                </select>
              </div>

              <div className="video-forms-form-group">
                <label htmlFor="tone" className="video-forms-form-label">
                  Tono
                </label>
                <select
                  id="tone"
                  name="tone"
                  value={formData.tone}
                  onChange={handleChange}
                  className="video-forms-select"
                  required
                >
                  <option value="">Selecciona un tono</option>
                  {TONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="video-forms-form-group">
                <label className="video-forms-form-label">Avatar</label>
                <div className="video-forms-avatar-dropdown">
                  <div
                    onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                    className="video-forms-avatar-selector"
                  >
                    <span>
                      {selectedAvatar ? selectedAvatar.name : 'Selecciona un avatar'}
                    </span>
                    <ChevronDown size={20} />
                  </div>
                  
                  {isAvatarDropdownOpen && (
                    <div ref={avatarDropdownRef} className="video-forms-avatar-dropdown-menu">
                      <GroupedAvatarsDropdown
                        avatarGroups={avatarGroups}
                        selectedAvatarId={selectedAvatar?.id || null}
                        onSelect={handleAvatarSelect}
                      />
                    </div>
                  )}
                </div>
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