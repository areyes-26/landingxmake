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
  { value: 'Profesional', label: 'Profesional' },
  { value: 'Entusiasta', label: 'Entusiasta' },
  { value: 'Conciso', label: 'Conciso' },
  { value: 'Amigable', label: 'Amigable' },
  { value: 'Creativo', label: 'Creativo' }
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "description") {
      if (value.length <= charLimit) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else if (name === "specificCallToAction") {
      // For textarea, we should always update the value
      setFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Enviando...');

    console.log('Form data before submission:', formData);

    if (!formData.avatarId) {
      setStatus('Error: Debes seleccionar un avatar.');
      setIsLoading(false);
      return;
    }

    const descriptionToSend = formData.description.length > charLimit
      ? formData.description.substring(0, charLimit)
      : formData.description;

    try {
      const res = await fetch('/api/send-to-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTitle: formData.videoTitle,
          description: descriptionToSend,
          topic: formData.topic,
          avatarId: formData.avatarId,
          callToAction: formData.callToAction,
          specificCallToAction: formData.specificCallToAction || '',
          tone: formData.tone,
          email: formData.email,
          duration: formData.duration
        }),
      });

      const result = await res.json();
      console.log('API response:', result);

      if (res.ok && (result.success || result.response || result.rawResponse)) {
        setStatus('¡Idea de video enviada correctamente!');
        setFormData({ videoTitle: '', description: '', topic: '', avatarId: '', callToAction: '', specificCallToAction: '', tone: '', email: '', duration: '' });
        setSelectedAvatar(null);
      } else {
        const errorMessage = result.error || (typeof result.rawResponse === 'string' ? result.rawResponse : JSON.stringify(result));
        setStatus(`Error al enviar: ${errorMessage}`);
      }
    } catch (error: any) {
      setStatus(`Error de conexión: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
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
              <div className="relative">
                <select
                  id="avatar"
                  name="avatar"
                  value={selectedAvatar?.id || ''}
                  onChange={(e) => {
                    const avatarId = e.target.value;
                    const avatar = avatarGroups.flatMap(group => group.options).find(a => a.id === avatarId);
                    if (avatar) {
                      handleAvatarSelect(avatar);
                    }
                  }}
                  className="w-full p-2 rounded-md border border-muted-foreground/20 text-muted-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                >
                  <option value="">Selecciona un avatar</option>
                  {avatarGroups.flatMap(group => group.options).map((avatar) => (
                    <option
                      key={avatar.id}
                      value={avatar.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 8px',
                        backgroundColor: selectedAvatar?.id === avatar.id ? 'var(--primary)' : 'transparent',
                        color: selectedAvatar?.id === avatar.id ? 'white' : 'var(--foreground)',
                      }}
                    >
                      <div className="flex-1">{avatar.name}</div>
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={avatar.imageUrl} alt={avatar.name} />
                        <AvatarFallback>{avatar.name[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </option>
                  ))}
                </select>
              </div>
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
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else {
      // Show validation error message or highlight required fields
      setStatus('Por favor, completa todos los campos requeridos en este paso');
    }
  };

  const validateStep = (step: number) => {
    const fields = STEPS[step].fields as (keyof FormData)[];
    return fields.every((field) => {
      const value = formData[field];
      // For duration, we need to check if it's a valid key from DURATION_LIMITS
      if (field === 'duration') {
        return Object.keys(DURATION_LIMITS).includes(value as string);
      }
      return value !== '';
    });
  };

  const renderStepContent = () => {
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
              <div className="relative">
                <select
                  id="avatar"
                  name="avatar"
                  value={selectedAvatar?.id || ''}
                  onChange={(e) => {
                    const avatarId = e.target.value;
                    const avatar = avatarGroups.flatMap(group => group.options).find(a => a.id === avatarId);
                    if (avatar) {
                      handleAvatarSelect(avatar);
                    }
                  }}
                  className="w-full p-2 rounded-md border border-muted-foreground/20 text-muted-foreground bg-transparent focus:outline-none focus:ring-2 focus:ring-primary pr-10"
                >
                  <option value="">Selecciona un avatar</option>
                  {avatarGroups.flatMap(group => group.options).map((avatar) => (
                    <option
                      key={avatar.id}
                      value={avatar.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '4px 8px',
                        backgroundColor: selectedAvatar?.id === avatar.id ? 'var(--primary)' : 'transparent',
                        color: selectedAvatar?.id === avatar.id ? 'white' : 'var(--foreground)',
                      }}
                    >
                      <div className="flex-1">{avatar.name}</div>
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={avatar.imageUrl} alt={avatar.name} />
                        <AvatarFallback>{avatar.name[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </option>
                  ))}
                </select>
              </div>
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
                      {renderStepContent()}
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
                  status.startsWith('Error') || status.startsWith('Error de conexión') 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-green-600/10 text-green-400'
                } border ${
                  status.startsWith('Error') || status.startsWith('Error de conexión') 
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