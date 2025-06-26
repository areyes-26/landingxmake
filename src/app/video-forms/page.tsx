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
import { useUserPlan } from '@/hooks/useUserPlan';
import { useCreditValidator } from '@/hooks/useCreditValidator';
import { calculateCreditCost, type VideoOptions } from '@/lib/creditPricing';
import './styles.css';
import { AvatarSelector } from '@/components/ui/AvatarSelector';

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
  lookId?: string;
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
  resolution?: 'hd' | 'fullhd';
  orientation?: 'vertical' | 'horizontal';
}

interface Step {
  title: string;
  fields: (keyof Omit<FormData, 'voiceDetails'>)[];
}

const STEPS: Step[] = [
  {
    title: "Basic Details",
    fields: ["videoTitle", "description", "duration"]
  },
  {
    title: "Call to Action",
    fields: ["callToAction", "specificCallToAction"]
  },
  {
    title: "Final Video Details",
    fields: ["topic", "tone", "avatarId", "voiceId"]
  }
];

const CALL_TO_ACTION_OPTIONS = [
  { value: 'Visita nuestro sitio web', label: 'Visit our website', icon: '🌐' },
  { value: 'Suscríbete ahora', label: 'Subscribe now', icon: '🔔' },
  { value: 'Comparte con tus amigos', label: 'Share with your friends', icon: '📱' },
  { value: 'Descarga nuestra app', label: 'Download our app', icon: '📱' }
] as const;

const TONE_OPTIONS = [
  { value: 'profesional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'entusiasta', label: 'Enthusiastic' },
  { value: 'humoristico', label: 'Humorous' },
  { value: 'inspirador', label: 'Inspirational' }
] as const;

const DURATION_LIMITS = {
  '30s': { label: '30 seconds', limit: 100 },
  '1min': { label: '1 minute', limit: 300 },
  '1.5min': { label: '1:30 minutes', limit: 600 },
};

const DESCRIPTION_LIMITS: Record<string, number> = {
  '30s': 200,
  '1min': 400,
  '1.5min': 600,
};

const MAIN_TOPIC_LIMIT = 120;

// SVGs para orientación
const VerticalIcon = () => (
  <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="24" height="32" rx="6" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
  </svg>
);
const HorizontalIcon = () => (
  <svg width="40" height="28" viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="32" height="20" rx="6" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
  </svg>
);

export default function VideoFormsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { userPlan } = useUserPlan();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCurrentStepValid, setIsCurrentStepValid] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/sessionLogout', { method: 'POST' });
      await signOut(auth);
      toast.success('Logged out successfully');
      router.push('/inicio');
      router.refresh();
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Error logging out');
    }
  };
  const [formData, setFormData] = useState<FormData>({
    videoTitle: '',
    description: '',
    topic: '',
    avatarId: '',
    lookId: undefined,
    callToAction: '',
    specificCallToAction: '',
    tone: '',
    email: '',
    duration: '30s',
    voiceId: '',
    resolution: 'hd',
    orientation: 'vertical',
  });

  useEffect(() => {
    const validateStep = () => {
      const currentStepFields = STEPS[currentStep].fields;
      const isValid = currentStepFields.every(field => {
        const value = formData[field];
        if (typeof value === 'string') {
          return value.trim() !== '';
        }
        return value !== null && value !== undefined;
      });
      setIsCurrentStepValid(isValid);
    };
    validateStep();
  }, [formData, currentStep]);

  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showInsufficientCreditsModal, setShowInsufficientCreditsModal] = useState(false);
  const [insufficientCreditsData, setInsufficientCreditsData] = useState<{
    required: number;
    current: number;
  } | null>(null);
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
    if (isCurrentStepValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Sending...');

    // Calcular dimension antes de enviar
    let dimension = { width: 720, height: 1280 };
    if (formData.orientation && formData.resolution) {
      if (formData.orientation === 'vertical' && formData.resolution === 'hd') {
        dimension = { width: 720, height: 1280 };
      } else if (formData.orientation === 'vertical' && formData.resolution === 'fullhd') {
        dimension = { width: 1080, height: 1920 };
      } else if (formData.orientation === 'horizontal' && formData.resolution === 'hd') {
        dimension = { width: 1280, height: 720 };
      } else if (formData.orientation === 'horizontal' && formData.resolution === 'fullhd') {
        dimension = { width: 1920, height: 1080 };
      }
    }

    try {
      console.log('Sending data:', formData);

      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, dimension }),
      });

      const data = await response.json();
      console.log('Server response:', data);

      if (!response.ok) {
        if (response.status === 403 && data.error === 'Not enough credits') {
          setShowInsufficientCreditsModal(true);
          setInsufficientCreditsData({ required: data.required, current: data.current });
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || data.details || 'Error processing request');
      }

      setStatus('Video created successfully!');
      router.push(`/videos/${data.firestoreId}`);

    } catch (error) {
      console.error('Full error:', error);
      setStatus(error instanceof Error ? error.message : 'Error processing request');
    } finally {
      setIsLoading(false);
    }
  };

  // Efectos para cargar datos
  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setLoadingVoices(true);
        const response = await fetch(`/api/voices?plan=${userPlan}`);
        if (response.ok) {
          const data = await response.json();
          setVoices(data.data || []);
          
          // Show plan-based voice limit info
          if (data.userPlan && data.totalVoices && data.filteredCount) {
            console.log(`User plan: ${data.userPlan}, Available voices: ${data.filteredCount}/${data.totalVoices}`);
          }
        }
      } catch (error) {
        console.error('Error fetching voices:', error);
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchVoices();
  }, [userPlan]);

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

  const handlePreviewVoice = async (e: React.MouseEvent, voice: HeyGenVoice) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (!voice.preview_url) {
      toast.error("No preview available for this voice.");
      return;
    }

    if (currentlyPlaying === voice.id) {
      audio.pause();
      setCurrentlyPlaying(null);
    } else {
      try {
        audio.src = voice.preview_url || '';
        await audio.play();
        setCurrentlyPlaying(voice.id);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'NotSupportedError') {
          toast.error("Preview format not supported for this voice.");
        } else {
          toast.error("Could not play voice preview.");
        }
        console.error("Error playing audio:", error);
        setCurrentlyPlaying(null);
      }
    }
  };

  const handleDurationChange = (duration: string) => {
    setFormData(prev => ({ ...prev, duration }));
  };

  const handleCallToActionChange = (cta: string) => {
    setFormData(prev => ({ ...prev, callToAction: cta }));
  };

  const handleResolutionChange = (resolution: 'hd' | 'fullhd') => {
    setFormData(prev => ({ ...prev, resolution }));
  };

  const handleOrientationChange = (orientation: 'vertical' | 'horizontal') => {
    setFormData(prev => ({ ...prev, orientation }));
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

  // Cerrar modal con Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && showInsufficientCreditsModal) {
        setShowInsufficientCreditsModal(false);
      }
    }
    
    if (showInsufficientCreditsModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showInsufficientCreditsModal]);

  return (
    <div className="video-forms-container">
      <audio ref={audioRef} onEnded={() => setCurrentlyPlaying(null)} />
      <div className="video-forms-main-container">
        {/* Form Header */}
        <div className="video-forms-form-header">
          <h1 className="video-forms-form-title">Create Video</h1>
          <p className="video-forms-form-subtitle">
            Share your story with the world. Fill out the form to create your video with AI.
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
                <label className="video-forms-form-label">Video Duration</label>
                <p className="video-forms-form-description">
                  Select the duration that best suits your content
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

              {/* Orientation + Quality Selector juntos */}
              <div className="video-forms-form-group">
                <div className="video-forms-orientation-quality-row">
                  <div style={{ flex: 1 }}>
                    <label className="video-forms-form-label">Orientation</label>
                    {(userPlan === 'pro' || userPlan === 'premium') ? (
                      <div className="video-forms-orientation-options">
                        <div
                          onClick={() => handleOrientationChange('vertical')}
                          className={`video-forms-orientation-option ${formData.orientation === 'vertical' ? 'selected' : ''}`}
                        >
                          <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><VerticalIcon /></span>
                          <div className="video-forms-duration-time">Vertical (9:16)</div>
                        </div>
                        <div
                          onClick={() => handleOrientationChange('horizontal')}
                          className={`video-forms-orientation-option ${formData.orientation === 'horizontal' ? 'selected' : ''}`}
                        >
                          <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><HorizontalIcon /></span>
                          <div className="video-forms-duration-time">Horizontal (16:9)</div>
                        </div>
                      </div>
                    ) : (
                      <div className="video-forms-orientation-options">
                        <div
                          className={`video-forms-orientation-option ${formData.orientation === 'vertical' ? 'selected' : ''}`}
                          style={{ cursor: 'default' }}
                        >
                          <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><VerticalIcon /></span>
                          <div className="video-forms-duration-time">Vertical (9:16)</div>
                        </div>
                        <div
                          className="video-forms-orientation-option"
                          style={{ cursor: 'not-allowed', opacity: 0.7 }}
                        >
                          <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><HorizontalIcon /></span>
                          <div className="video-forms-duration-time">Horizontal (16:9)</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="video-forms-form-label">Quality</label>
                    {userPlan === 'pro' ? (
                      <div className="video-forms-orientation-options">
                        <div
                          onClick={() => handleResolutionChange('hd')}
                          className={`video-forms-orientation-option ${formData.resolution === 'hd' ? 'selected' : ''}`}
                        >
                          <div className="video-forms-duration-time">HD (720p)</div>
                        </div>
                        <div
                          onClick={() => handleResolutionChange('fullhd')}
                          className={`video-forms-orientation-option ${formData.resolution === 'fullhd' ? 'selected' : ''}`}
                        >
                          <div className="video-forms-duration-time">Full HD (1080p)</div>
                        </div>
                      </div>
                    ) : (
                      <div className="video-forms-orientation-options">
                        <div
                          className={`video-forms-orientation-option ${formData.resolution === 'hd' ? 'selected' : ''}`}
                          style={{ cursor: 'default' }}
                        >
                          <div className="video-forms-duration-time">HD (720p)</div>
                        </div>
                        <div
                          className="video-forms-orientation-option"
                          style={{ cursor: 'not-allowed', opacity: 0.7 }}
                        >
                          <div className="video-forms-duration-time">Full HD (1080p)</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {userPlan === 'free' && (
                  <div className="video-forms-plan-upgrade-hint">
                    <span className="video-forms-upgrade-icon">💡</span>
                    <span>Upgrade to Pro to change orientation and quality</span>
                  </div>
                )}
              </div>

              <div className="video-forms-form-group">
                <label htmlFor="videoTitle" className="video-forms-form-label">
                  Video Title
                </label>
                <input
                  type="text"
                  id="videoTitle"
                  name="videoTitle"
                  value={formData.videoTitle}
                  onChange={handleChange}
                  className="video-forms-input"
                  placeholder="Write an attractive title for your video"
                  required
                />
              </div>

              <div className="video-forms-form-group">
                <label htmlFor="description" className="video-forms-form-label">
                  Video Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={e => {
                    const max = DESCRIPTION_LIMITS[formData.duration] || 200;
                    let value = e.target.value;
                    if (value.length > max) value = value.slice(0, max);
                    setFormData(prev => ({ ...prev, description: value }));
                  }}
                  className="video-forms-textarea"
                  placeholder="Write a detailed description for the video"
                  maxLength={DESCRIPTION_LIMITS[formData.duration] || 200}
                  style={{ resize: 'none' }}
                />
                <div className="video-forms-char-counter">
                  {formData.description.length}/{DESCRIPTION_LIMITS[formData.duration] || 200} characters
                </div>
              </div>
            </div>

            {/* Step 2: Call to Action */}
            <div className={`video-forms-form-step ${currentStep === 1 ? 'active' : ''}`}>
              <div className="video-forms-form-group">
                <label className="video-forms-form-label">Call to Action</label>
                <p className="video-forms-form-description">
                  Select what action you want viewers to take
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
                  Custom CTA Text
                </label>
                <p className="video-forms-form-description">
                  Customize your call to action message
                </p>
                <textarea
                  id="specificCallToAction"
                  name="specificCallToAction"
                  value={formData.specificCallToAction}
                  onChange={handleChange}
                  className="video-forms-textarea"
                  placeholder="Write your custom message here..."
                  style={{ resize: 'none' }}
                />
              </div>
            </div>

            {/* Step 3: Final Details */}
            <div className={`video-forms-form-step ${currentStep === 2 ? 'active' : ''}`}>
              <div className="video-forms-form-group">
                <label htmlFor="topic" className="video-forms-form-label">
                  Main Topic
                </label>
                <p className="video-forms-form-description">
                  Describe what you want your video to be about
                </p>
                <textarea
                  id="topic"
                  name="topic"
                  value={formData.topic}
                  onChange={e => {
                    let value = e.target.value;
                    if (value.length > MAIN_TOPIC_LIMIT) value = value.slice(0, MAIN_TOPIC_LIMIT);
                    setFormData(prev => ({ ...prev, topic: value }));
                  }}
                  className="video-forms-textarea"
                  placeholder="Example: I want it to be about the Club World Cup"
                  maxLength={MAIN_TOPIC_LIMIT}
                  style={{ resize: 'none', height: '56px' }}
                />
                <div className="video-forms-char-counter">
                  {formData.topic.length}/{MAIN_TOPIC_LIMIT} characters
                </div>
              </div>

              <div className="video-forms-form-group">
                <label htmlFor="tone" className="video-forms-form-label">Tone</label>
                <div className="relative" ref={toneDropdownRef}>
                  <button
                    type="button"
                    className="voice-select text-left"
                    onClick={() => setIsToneDropdownOpen(!isToneDropdownOpen)}
                  >
                    {TONE_OPTIONS.find(o => o.value === formData.tone)?.label || 'Select a tone'}
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
                <label htmlFor="voiceId" className="video-forms-form-label">
                  Voice
                  <span className="video-forms-plan-indicator">
                    {userPlan === 'free' && ' (Free Plan: 20 voices)'}
                    {userPlan === 'premium' && ' (Basic Plan: 100 voices)'}
                    {userPlan === 'pro' && ' (Pro Plan: All voices)'}
                  </span>
                </label>
                <div className="relative" ref={voiceDropdownRef}>
                  <button
                    type="button"
                    className="voice-select text-left"
                    onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
                  >
                    {formData.voiceDetails ? `${formData.voiceDetails.name} - ${formData.voiceDetails.language}` : 'Select a voice'}
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
                {userPlan !== 'pro' && (
                  <div className="video-forms-plan-upgrade-hint">
                    <span className="video-forms-upgrade-icon">💡</span>
                    <span>
                      {userPlan === 'free' && 'Upgrade to Pro to access all available voices'}
                      {userPlan === 'premium' && 'Upgrade to Pro to access all available voices'}
                    </span>
                  </div>
                )}
              </div>
              <div className="video-forms-form-group">
                <label className="video-forms-form-label">Avatar</label>
                <AvatarSelector
                  onAvatarSelect={(avatarId, lookId) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      avatarId, 
                      lookId 
                    }));
                  }}
                  selectedAvatarId={formData.avatarId}
                  selectedLookId={formData.lookId}
                />
              </div>
            </div>

            {/* Navigation */}
            <div className="video-forms-navigation">
              <div className="video-forms-credits-info">
                <div className="video-forms-credits-icon">💎</div>
                <span>{currentCost} credits</span>
                {creditsWarning && (
                  <div className="video-forms-low-credits-warning">
                    <span className="video-forms-warning-icon">⚠️</span>
                    <span className="video-forms-warning-text">Low credits</span>
                    <Link 
                      href="/account-setting/credit-topup" 
                      className="video-forms-topup-link"
                    >
                      Top up
                    </Link>
                  </div>
                )}
                {/* {userPlan !== 'pro' && (
                  <div className="video-forms-upgrade-plan-button">
                    <Link 
                      href="/account-setting?section=pricing" 
                      className="video-forms-upgrade-link"
                    >
                      🚀 Actualizar Plan
                    </Link>
                  </div>
                )} */}
              </div>

              <div className="flex items-center gap-4">
                {currentStep > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isLoading}
                    className="video-forms-nav-button video-forms-nav-button-secondary"
                  >
                    ← Back
                  </button>
                )}
                
                {currentStep < STEPS.length - 1 && (
                  <div className="tooltip-container">
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!isCurrentStepValid || !canAffordCurrent}
                      className="video-forms-nav-button video-forms-nav-button-primary"
                    >
                      Next →
                    </button>
                    {!isCurrentStepValid && (
                      <span className="tooltip-text">Please fill in all fields to continue</span>
                    )}
                  </div>
                )}

                {currentStep === STEPS.length - 1 && (
                  <div className="tooltip-container">
                    <button
                      type="submit"
                      disabled={isLoading || !isCurrentStepValid || !canAffordCurrent}
                      className="video-forms-nav-button video-forms-nav-button-primary"
                    >
                      {isLoading ? "Creating..." : "🚀 Create Video"}
                    </button>
                    {!isCurrentStepValid && (
                      <span className="tooltip-text">Please fill in all fields to create the video</span>
                    )}
                  </div>
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

        {/* Insufficient Credits Modal */}
        {showInsufficientCreditsModal && insufficientCreditsData && (
          <div 
            className="video-forms-modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowInsufficientCreditsModal(false);
              }
            }}
          >
            <div className="video-forms-modal">
              <div className="video-forms-modal-header">
                <div className="video-forms-modal-icon">💎</div>
                <h3 className="video-forms-modal-title">Insufficient Credits</h3>
              </div>
              
              <div className="video-forms-modal-content">
                <p className="video-forms-modal-message">
                  You don't have enough credits to create this video.
                </p>
                
                <div className="video-forms-credits-breakdown">
                  <div className="video-forms-credit-item">
                    <span className="video-forms-credit-label">Required:</span>
                    <span className="video-forms-credit-value required">{insufficientCreditsData.required} credits</span>
                  </div>
                  <div className="video-forms-credit-item">
                    <span className="video-forms-credit-label">Your balance:</span>
                    <span className="video-forms-credit-value current">{insufficientCreditsData.current} credits</span>
                  </div>
                  <div className="video-forms-credit-item">
                    <span className="video-forms-credit-label">Missing:</span>
                    <span className="video-forms-credit-value missing">{insufficientCreditsData.required - insufficientCreditsData.current} credits</span>
                  </div>
                </div>
              </div>
              
              <div className="video-forms-modal-actions">
                <button
                  onClick={() => setShowInsufficientCreditsModal(false)}
                  className="video-forms-modal-button secondary"
                >
                  Cancel
                </button>
                <Link
                  href="/account-setting/credit-topup"
                  className="video-forms-modal-button primary"
                >
                  💎 Top Up Credits
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 