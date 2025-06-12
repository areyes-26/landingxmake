'use client';

import { useState, type FormEvent, type ChangeEvent, useEffect, useRef, Fragment } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, PlaySquare, User, ChevronDown, Check } from "lucide-react";
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { HeyGenVoice } from '@/lib/heygen';
import GroupedAvatarsDropdown from '@/components/ui/GroupedAvatarsDropdown';

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

interface VoiceOption {
  id: string;
  name: string;
  language: string;
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
  { value: 'Visita nuestro sitio web', label: 'Visita nuestro sitio web' },
  { value: 'Suscríbete ahora', label: 'Suscríbete ahora' },
  { value: 'Comparte con tus amigos', label: 'Comparte con tus amigos' },
  { value: 'Descarga nuestra app', label: 'Descarga nuestra app' }
] as const;

type CallToActionOption = typeof CALL_TO_ACTION_OPTIONS[number];

const TONE_OPTIONS = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'casual', label: 'Casual' },
  { value: 'entusiasta', label: 'Entusiasta' },
  { value: 'humoristico', label: 'Humorístico' },
  { value: 'inspirador', label: 'Inspirador' }
] as const;

type ToneOption = typeof TONE_OPTIONS[number];

const DURATION_LIMITS = {
  '30s': { label: '30 segundos', limit: 100 },
  '1min': { label: '1 minuto', limit: 300 },
  '1.5min': { label: '1:30 minutos', limit: 600 },
};

type DurationKey = keyof typeof DURATION_LIMITS;

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

export default function Home() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({
    videoTitle: '',
    description: '',
    topic: '',
    avatarId: '',
    callToAction: '',
    specificCallToAction: '',
    tone: '',
    email: '',
    duration: '',
    voiceId: '',
  });

  const [showSpecificCallToAction, setShowSpecificCallToAction] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<DurationKey>('1.5min');

  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const [isAvatarDropdownOpen, setIsAvatarDropdownOpen] = useState(false);
  const avatarDropdownRef = useRef<HTMLDivElement>(null);

  const [avatarGroups, setAvatarGroups] = useState<AvatarGroup[]>([]);
  const [loadingAvatars, setLoadingAvatars] = useState(true);

  // ——— Estados para el nuevo dropdown ———
  const [avatarGroupList, setAvatarGroupList] = useState<{id:string,name:string}[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [avatarsByGroup, setAvatarsByGroup] = useState<AvatarOption[]>([]);

  const [voices, setVoices] = useState<HeyGenVoice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="duration">Duración del video</Label>
              <Tabs value={activeTab} onValueChange={(value) => {
                setActiveTab(value as DurationKey);
                setFormData(prev => ({ ...prev, duration: value }));
              }} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
                  {(Object.keys(DURATION_LIMITS) as DurationKey[]).map((key) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className={`w-full text-center ${
                        activeTab === key ? 'bg-primary text-primary-foreground' : 'bg-background'
                      }`}
                    >
                      {DURATION_LIMITS[key].label}
                      <span className="text-xs ml-1 text-muted-foreground/80">({DURATION_LIMITS[key].limit} caract.)</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div>
              <Label htmlFor="videoTitle">Título del video</Label>
              <Input
                id="videoTitle"
                name="videoTitle"
                value={formData.videoTitle}
                onChange={handleChange}
                placeholder="Escribe un título atractivo para tu video"
                className="border border-muted-foreground/20"
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción del video</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Escribe una descripción detallada del video"
                maxLength={DURATION_LIMITS[activeTab].limit}
                className="border border-muted-foreground/20 min-h-[120px] p-2"
              />
              <p className="text-xs text-right text-muted-foreground mt-1">
                {formData.description.length}/{DURATION_LIMITS[activeTab].limit} caracteres
              </p>
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="callToAction">Llamado a la acción</Label>
              <select
                id="callToAction"
                name="callToAction"
                value={formData.callToAction}
                onChange={(e) => {
                  const value = e.target.value;
                  handleChange(e);
                  if (value) {
                    setShowSpecificCallToAction(true);
                  } else {
                    setShowSpecificCallToAction(false);
                  }
                }}
                className="w-full p-2 rounded-md border border-muted-foreground/20 text-muted-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-primary pr-10"
              >
                <option value="">Selecciona un llamado a la acción</option>
                {CALL_TO_ACTION_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {showSpecificCallToAction && (
              <div className="space-y-4">
                <Textarea
                  id="specificCallToAction"
                  name="specificCallToAction"
                  value={formData.specificCallToAction}
                  onChange={handleChange}
                  placeholder="Escribe el mensaje específico para el llamado a la acción"
                  className="w-full p-2 rounded-md border border-muted-foreground/20 text-muted-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                />
              </div>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="topic">Tema principal</Label>
              <Textarea
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 100) {
                    setFormData(prev => ({ ...prev, topic: value }));
                  }
                }}
                placeholder="Escribe el tema principal del video"
                className="w-full p-2 rounded-md border border-muted-foreground/20 text-muted-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-primary text-lg"
              />
              <p className="text-right text-sm text-muted-foreground">
                {formData.topic.length}/100 caracteres
              </p>
            </div>
            <div>
              <Label htmlFor="voice">Voz</Label>
              <select
                value={formData.voiceId}
                onChange={(e) => {
                  const selectedVoice = voices.find(v => v.id === e.target.value);
                  setFormData(prev => ({
                    ...prev,
                    voiceId: e.target.value,
                    voiceDetails: selectedVoice ? {
                      name: selectedVoice.name,
                      language: selectedVoice.language,
                      gender: selectedVoice.gender,
                      preview_url: selectedVoice.preview_url
                    } : undefined
                  }));
                }}
                className="w-full p-2 border rounded-md bg-white text-gray-900"
                required
              >
                <option value="">Selecciona una voz</option>
                {voices.map((voice) => (
                  <option key={voice.id} value={voice.id}>
                    {voice.name} ({voice.language})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="tone">Tono</Label>
              <select
                id="tone"
                name="tone"
                value={formData.tone}
                onChange={handleChange}
                className="w-full p-2 rounded-md border border-muted-foreground/20 text-muted-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Selecciona un tono</option>
                {TONE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="avatar">Avatar</Label>
              <GroupedAvatarsDropdown
                selectedAvatarId={selectedAvatar?.id || ''}
                onSelect={(avatar) => {
                  setSelectedAvatar(avatar);
                  setFormData(prev => ({ ...prev, avatarId: avatar.id }));
                }}
                avatarGroups={avatarGroups}
              />
            </div>
            {selectedAvatar && (
              <div className="mt-4">
                <Label htmlFor="email">Email de envío</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Ingresa tu email"
                  className="border border-muted-foreground/20 text-muted-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // 1) Traer la lista de grupos una sola vez:
  useEffect(() => {
    fetch('/api/avatar-groups')
      .then(r => r.json())
      .then(json => setAvatarGroupList(json.data || []))
      .catch(console.error);
  }, []);

  // 2) Cada vez que cambie selectedGroupId, traer sólo esos avatares
  useEffect(() => {
    if (!selectedGroupId) {
      setAvatarsByGroup([]);
      return;
    }
    fetch(`/api/avatars-by-group?groupId=${selectedGroupId}`)
      .then(r => r.json())
      .then(json => setAvatarsByGroup(json.data || []))
      .catch(console.error);
  }, [selectedGroupId]);

  const charLimit = DURATION_LIMITS[activeTab].limit;

  const handleAvatarSelect = (avatar: AvatarOption) => {
    setSelectedAvatar(avatar);
    setFormData(prev => ({ ...prev, avatarId: avatar.id }));
    setIsAvatarDropdownOpen(false);
  };

  useEffect(() => {
    const fetchAvatars = async () => {
      setLoadingAvatars(true); // ⬅️ empezamos la carga
      try {
        const res = await fetch('/api/avatars');
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || 'Error al obtener avatares');

        const avatars: AvatarOption[] = data.data.avatars.map((avatar: any) => ({
          id: avatar.avatar_id,
          name: avatar.avatar_name,
          imageUrl: avatar.preview_image_url,
          dataAiHint: avatar.gender + ' face',
        }));

        const photos: AvatarOption[] = data.data.talking_photos.map((photo: any) => ({
          id: photo.talking_photo_id,
          name: photo.talking_photo_name,
          imageUrl: photo.preview_image_url,
          dataAiHint: 'photo avatar',
        }));

        const groupedAvatars: AvatarGroup[] = [
          { title: 'Avatares Normales', options: avatars },
          { title: 'Fotos Parlantes', options: photos },
        ];

        setAvatarGroups(groupedAvatars);
      } catch (error: any) {
        console.error('Error al cargar avatares:', error.message);
      } finally {
        setLoadingAvatars(false); // ⬅️ terminamos la carga
      }
    };

    fetchAvatars();
  }, []);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        console.log('Fetching voices from API...');
        const response = await fetch('/api/voices');
        const data = await response.json();
        console.log('Voices data received:', data);
        if (data.data) {
          setVoices(data.data);
        }
      } catch (error) {
        console.error('Error fetching voices:', error);
      } finally {
        setLoadingVoices(false);
      }
    };

    fetchVoices();
  }, []);

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const voiceId = e.target.value;
    const selectedVoice = voices.find(voice => voice.id === voiceId);
    
    setFormData(prev => ({
      ...prev,
      voiceId: voiceId,
      voiceDetails: selectedVoice ? {
        name: selectedVoice.name,
        language: selectedVoice.language,
        gender: selectedVoice.gender,
        preview_url: selectedVoice.preview_url
      } : undefined
    }));
  };

  const handleNext = () => {
    // Validar campos según el paso actual
    const currentStepFields = STEPS[currentStep].fields;
    const missingFields = currentStepFields.filter(field => !formData[field as keyof FormData]);
    
    if (missingFields.length > 0) {
      let errorMessage = 'Por favor completa todos los campos requeridos: ';
      if (currentStep === 0) {
        errorMessage = 'Por favor completa el título, descripción y duración del video.';
      } else if (currentStep === 1) {
        errorMessage = 'Por favor selecciona un llamado a la acción.';
      } else if (currentStep === 2) {
        errorMessage = 'Por favor selecciona un avatar y completa los campos restantes.';
      }
      setStatus(errorMessage);
      return;
    }

    if (currentStep === STEPS.length - 1) {
      handleSubmit(new Event('submit') as any);
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Enviando...');

    try {
      // Validar que se haya seleccionado un avatar
      if (!formData.avatarId) {
        setStatus('Por favor selecciona un avatar');
        setIsLoading(false);
        return;
      }

      // Validar que se haya seleccionado una voz
      if (!formData.voiceId) {
        setStatus('Por favor selecciona una voz');
        setIsLoading(false);
        return;
      }

      console.log('Enviando datos:', formData);

      // Enviar datos al endpoint
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      console.log('Respuesta del servidor:', data);

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Error al procesar la solicitud');
      }

      setStatus('¡Video creado exitosamente!');
      
      // Redirigir a la vista previa
      window.location.href = `/video-settings-preview?id=${data.firestoreId}`;

    } catch (error) {
      console.error('Error completo:', error);
      setStatus(error instanceof Error ? error.message : 'Error al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="flex flex-col items-center">
        <div className="w-full max-w-4xl px-4">
          <div className="text-center mb-8 mt-8">
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Enviar un Video</h1>
            <p className="text-lg text-muted-foreground">Comparte tu historia con el mundo. Completa el formulario para enviar tu idea de video.</p>
          </div>

          <div className="bg-card p-6 sm:p-8 rounded-xl shadow-2xl mt-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center mb-4">
                <div className="flex space-x-4">
                  {STEPS.map((step, index) => (
                    <div
                      key={index}
                      className={`inline-flex items-center px-4 py-2 rounded-full border ${
                        index === currentStep
                          ? 'border-primary text-primary'
                          : index < currentStep
                          ? 'border-green-500 text-green-500'
                          : 'border-muted-foreground/20 text-muted-foreground'
                      }`}
                    >
                      {index + 1}. {step.title}
                    </div>
                  ))}
                </div>
              </div>

              <div className="max-w-4xl mx-auto w-full">
                {STEPS.map((step, index) => (
                  index === currentStep ? (
                    <div key={index} className="space-y-6">
                      {renderStep()}
                      <div className="flex justify-end space-x-2">
                        {currentStep > 0 && (
                          <Button
                            variant="outline"
                            onClick={handleBack}
                            disabled={isLoading}
                          >
                            Atrás
                          </Button>
                        )}
                        <Button
                          onClick={handleNext}
                          disabled={isLoading}
                        >
                          {currentStep === STEPS.length - 1 ? 'Crear video' : 'Siguiente'}
                        </Button>
                      </div>
                    </div>
                  ) : null
                ))}
              </div>

              {status && (
                <p className={`mt-6 text-sm p-4 rounded-lg ${
                  status?.startsWith('Error') || status?.startsWith('Error de conexión') 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-green-600/10 text-green-400'
                } border ${
                  status?.startsWith('Error') || status?.startsWith('Error de conexión') 
                    ? 'border-destructive/30' 
                    : 'border-green-600/30'
                }`}>
                  {status}
                </p>
              )}
            </form>
          </div>
        </div>
      </main>
      <div className="fixed bottom-4 right-4 z-50">
        <Link
          href="/privacy"
          className="bg-muted/50 hover:bg-muted/70 border border-border text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200"
          aria-label="Ver Política de Privacidad"
        >
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}