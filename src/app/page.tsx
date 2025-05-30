
'use client';

import { useState, type FormEvent, type ChangeEvent, useEffect, useRef, Fragment } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Bell, PlaySquare, User, ChevronDown, Check } from "lucide-react";

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
}

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
  const [formData, setFormData] = useState<FormData>({
    videoTitle: '',
    description: '',
    topic: '',
    avatarId: ''
  });
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

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "description") {
      if (value.length <= charLimit) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
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
        body: JSON.stringify({ ...formData, description: descriptionToSend, topic: formData.topic, videoTitle: formData.videoTitle }),
      });

      const result = await res.json();

      if (res.ok && (result.success || result.response || result.rawResponse)) {
        setStatus('¡Idea de video enviada correctamente!');
        setFormData({ videoTitle: '', description: '', topic: '', avatarId: '' });
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-3">
            <PlaySquare className="h-7 w-7 text-primary" />
            <span className="font-semibold text-xl">Plataforma de Video</span>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <a href="#" className="text-foreground/70 hover:text-foreground transition-colors">Inicio</a>
            <a href="#" className="text-foreground/70 hover:text-foreground transition-colors">Explorar</a>
            <a href="#" className="text-primary font-semibold hover:text-primary/90 transition-colors">Crear</a>
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-foreground hover:bg-accent/50">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarImage src="https://placehold.co/40x40.png" alt="Avatar de Usuario" data-ai-hint="profile woman" />
              <AvatarFallback><User size={18}/></AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-12 flex justify-center">
        <div className="w-full max-w-2xl bg-card p-6 sm:p-8 rounded-xl shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Enviar un Video</h1>
            <p className="text-muted-foreground mt-2 text-base">
              Comparte tu historia con el mundo. Completa el formulario para enviar tu idea de video.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as DurationKey)} className="w-full mb-6">
            <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 mb-6">
              {(Object.keys(DURATION_LIMITS) as DurationKey[]).map((key) => (
                <TabsTrigger
                  key={key}
                  value={key}
                >
                  {DURATION_LIMITS[key].label}
                  <span className="text-xs ml-1 text-muted-foreground/80">({DURATION_LIMITS[key].limit} caract.)</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="pt-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="videoTitle" className="text-sm font-medium mb-2 block text-foreground/90">Título del Video</Label>
                  <Input
                    id="videoTitle"
                    name="videoTitle"
                    placeholder="Introduce el título de tu video"
                    value={formData.videoTitle}
                    onChange={handleChange}
                    required
                    className="bg-input border-border placeholder:text-muted-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium mb-2 block text-foreground/90">Descripción del Video</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe tu video en detalle..."
                    value={formData.description}
                    onChange={handleChange}
                    maxLength={charLimit}
                    required
                    className="min-h-[150px] bg-input border-border placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5 text-right">
                    {formData.description.length}/{charLimit} caracteres
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="topic" className="text-sm font-medium mb-2 block text-foreground/90">Tema Principal</Label>
                    <Input
                      id="topic"
                      name="topic"
                      placeholder="Ej: Tecnología, Cocina"
                      value={formData.topic}
                      onChange={handleChange}
                      required
                      className="bg-input border-border placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="relative" ref={avatarDropdownRef}>
                    <Label className="text-sm font-medium mb-2 block text-foreground/90">Avatar</Label>
                    <button
                      type="button"
                      onClick={() => setIsAvatarDropdownOpen(!isAvatarDropdownOpen)}
                      className="flex items-center justify-between w-full h-12 rounded-md border border-input bg-input px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left"
                      aria-haspopup="listbox"
                      aria-expanded={isAvatarDropdownOpen}
                    >
                      {selectedAvatar ? (
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={selectedAvatar.imageUrl} alt={selectedAvatar.name} data-ai-hint={selectedAvatar.dataAiHint} />
                            <AvatarFallback>{selectedAvatar.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-foreground">{selectedAvatar.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Seleccionar Avatar</span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isAvatarDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isAvatarDropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                        <ul role="listbox">
                        {loadingAvatars && (
                          <li className="p-3 text-sm text-muted-foreground">Cargando avatares...</li>
                        )}

                        {avatarGroups.map((group) => (
                            <Fragment key={group.title}>
                              <li className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {group.title}
                              </li>
                              {group.options.map((avatar) => (
                                <li
                                  key={avatar.id}
                                  onClick={() => handleAvatarSelect(avatar)}
                                  className="flex items-center justify-between p-3 hover:bg-accent cursor-pointer text-sm text-foreground"
                                  role="option"
                                  aria-selected={selectedAvatar?.id === avatar.id}
                                >
                                  <div className="flex items-center space-x-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage src={avatar.imageUrl} alt={avatar.name} data-ai-hint={avatar.dataAiHint} />
                                      <AvatarFallback>{avatar.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span>{avatar.name}</span>
                                  </div>
                                  {selectedAvatar?.id === avatar.id && <Check className="h-4 w-4 text-primary" />}
                                </li>
                              ))}
                            </Fragment>
                          ))}
                        </ul>
                      </div>
                    )}
                     {!formData.avatarId && !isLoading && status?.includes("Debes seleccionar un avatar") && (
                       <p className="text-xs text-destructive mt-1">Este campo es requerido.</p>
                     )}
                  </div>
                </div>
                
                              {/* —— Nuevo selector de GRUPOS —— */}
                <div className="mt-6">
                  <Label className="text-sm font-medium mb-2 block text-foreground/90">
                    Grupo de Avatares
                  </Label>
                  <select
                    className="w-full border border-border rounded-md p-2 bg-input text-foreground"
                    value={selectedGroupId}
                    onChange={e => setSelectedGroupId(e.target.value)}
                  >
                    <option value="">Seleccionar grupo</option>
                    {avatarGroupList.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* —— Muestra los avatares de ese grupo —— */}
                {avatarsByGroup.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                    {avatarsByGroup.map(av => (
                      <div
                        key={av.id}
                        className="flex flex-col items-center p-3 border border-border rounded-md hover:bg-accent cursor-pointer"
                        onClick={() => handleAvatarSelect(av)}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={av.imageUrl} alt={av.name} />
                          <AvatarFallback>{av.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="mt-2 text-sm">{av.name}</span>
                        {selectedAvatar?.id === av.id && (
                          <Check className="h-4 w-4 text-primary mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                )}



                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="min-w-[180px] text-base py-3 px-6 shadow-md hover:shadow-lg transition-shadow duration-150 ease-in-out"
                    size="lg"
                  >
                    {isLoading ? 'Enviando...' : 'Enviar Video'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>

          {status && (
            <p className={`mt-6 text-sm p-4 rounded-lg ${status.startsWith('Error') || status.startsWith('Error de conexión') ? 'bg-destructive/10 text-destructive' : 'bg-green-600/10 text-green-400'} border ${status.startsWith('Error') || status.startsWith('Error de conexión') ? 'border-destructive/30' : 'border-green-600/30'}`}>
              {status}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

    