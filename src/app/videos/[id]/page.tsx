'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'react-hot-toast';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VideoData } from '@/types/video';

export default function VideoSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
  const [isRegeneratingSocial, setIsRegeneratingSocial] = useState(false);
  const [isRegeneratingScript, setIsRegeneratingScript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoSettings, setVideoSettings] = useState<VideoData | null>(null);
  const [activeTab, setActiveTab] = useState('script');

  useEffect(() => {
    if (params.id) {
      console.log('🔄 useEffect triggered with videoId:', params.id);
      console.log('🚀 Loading video settings for ID:', params.id);
      fetchVideoSettings(params.id as string);
    } else {
      console.log('❌ No video ID found in params');
      setIsLoading(false);
      setError('No se encontró el ID del video');
    }
  }, [params.id]);
  useEffect(() => {
    const missingData =
      videoSettings &&
      (!videoSettings.script || !videoSettings.shortCopy || !videoSettings.longCopy);
  
    if (missingData) {
      console.log('🔁 Datos incompletos, reintentando obtener desde Firestore en 4 segundos...');
      const timeout = setTimeout(() => {
        if (params.id) {
          setIsLoading(true); // ← Esta línea da feedback visual
          fetchVideoSettings(params.id as string);
        }
      }, 4000);
  
      return () => clearTimeout(timeout);
    }
  }, [videoSettings, params.id]);

  // Efecto adicional para recargar datos si el video está en estado "pending" o "processing"
  useEffect(() => {
    if (videoSettings && (videoSettings.status === 'pending' || videoSettings.status === 'processing')) {
      console.log('⏳ Video en estado pending/processing, recargando en 3 segundos...');
      const timer = setTimeout(() => {
        if (params.id) {
          fetchVideoSettings(params.id as string);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [videoSettings?.status, params.id]);

  // Redirección automática si el video es un draft
  useEffect(() => {
    if (videoSettings && videoSettings.status === 'draft') {
      const step = videoSettings.currentStep || 0;
      router.replace(`/video-forms?id=${params.id}&step=${step}`);
    }
  }, [videoSettings, params.id, router]);

  const fetchVideoSettings = async (videoId: string) => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching video settings for ID:', videoId);
      
      // Obtener datos del video
      const videoRef = doc(db, 'videos', videoId);
      const videoDoc = await getDoc(videoRef);
      if (!videoDoc.exists()) {
        console.log('❌ Video document not found');
        setError('Video no encontrado');
        return;
      }
      const data = videoDoc.data();
      console.log('📦 Video data loaded:', data);
      
      let settings: VideoData = { ...data, id: videoId } as VideoData;
      
      // Obtener datos de completion_results_videos
      const completionRef = doc(db, 'completion_results_videos', videoId);
      const completionDoc = await getDoc(completionRef);
      if (completionDoc.exists()) {
        const completionData = completionDoc.data();
        console.log('📝 Completion data loaded:', completionData);
        
        settings = {
          ...settings,
          script: completionData.script || settings.script,
          shortCopy: completionData.shortCopy || settings.shortCopy,
          longCopy: completionData.longCopy || settings.longCopy
        };
        
        // Verificar si los datos están presentes
        if (settings.script) {
          console.log('✅ Script encontrado, longitud:', settings.script.length);
        } else {
          console.log('❌ No hay script');
        }
        
        if (settings.shortCopy) {
          console.log('✅ Short copy encontrado:', settings.shortCopy);
        } else {
          console.log('❌ No hay short copy');
        }
        
        if (settings.longCopy) {
          console.log('✅ Long copy encontrado:', settings.longCopy);
        } else {
          console.log('❌ No hay long copy');
        }
      } else {
        console.log('❌ Completion document not found');
      }
      
      console.log('🎯 Final settings:', settings);
      setVideoSettings(settings);
    } catch (error) {
      console.error('❌ Error fetching video settings:', error);
      setError('Error al cargar la configuración del video');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!videoSettings) return;
    try {
      setIsLoading(true);
      console.log('[Guardar Cambios] Iniciando guardado de título en videos:', videoSettings.videoTitle);
      
      // Verificar si el formulario está completo
      const isFormComplete = videoSettings.script && 
                           videoSettings.videoTitle && 
                           videoSettings.voiceId && 
                           videoSettings.avatarId;

      // Guardar título y estado
      const videoRef = doc(db, 'videos', params.id as string);
      await setDoc(videoRef, {
        videoTitle: videoSettings.videoTitle,
        status: isFormComplete ? 'processing' : 'draft',
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('[Guardar Cambios] Título guardado en videos');

      // Guardar script y copys
      console.log('[Guardar Cambios] Iniciando guardado de script y copys en completion_results_videos:', {
        script: videoSettings.script,
        shortCopy: videoSettings.shortCopy,
        longCopy: videoSettings.longCopy
      });
      const completionRef = doc(db, 'completion_results_videos', params.id as string);
      await setDoc(completionRef, {
        script: videoSettings.script,
        shortCopy: videoSettings.shortCopy,
        longCopy: videoSettings.longCopy,
        updatedAt: serverTimestamp()
      }, { merge: true });
      console.log('[Guardar Cambios] Script y copys guardados en completion_results_videos');

      // Solo iniciar la generación si el formulario está completo
      if (isFormComplete) {
        const response = await fetch('/api/heygen/generate-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId: params.id,
            script: videoSettings.script,
            videoTitle: videoSettings.videoTitle,
            voiceId: videoSettings.voiceId,
            avatarId: videoSettings.avatarId,
            tone: videoSettings.tone,
            duration: videoSettings.duration,
          }),
        });

        if (!response.ok) {
          throw new Error('Error al iniciar la generación del video');
        }

        toast.success('Cambios guardados correctamente');
        router.push(`/videos/${params.id}/generating`);
      } else {
        toast.success('Borrador guardado correctamente');
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      toast.error('Error al guardar los cambios');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateTitle = async () => {
    if (!videoSettings) return;
    try {
      setIsRegeneratingTitle(true);
      const response = await fetch('/api/openai/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalTitle: videoSettings.videoTitle,
          topic: videoSettings.topic,
          description: videoSettings.description,
          tone: videoSettings.tone,
          videoId: params.id
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Respuesta del servidor:', text);
        throw new Error('Error al regenerar el título');
      }
      const data = await response.json();
      setVideoSettings({ ...videoSettings, videoTitle: data.title });
      toast.success('Título regenerado correctamente');
    } catch (error) {
      toast.error('Error al regenerar el título');
      console.error('Error:', error);
    } finally {
      setIsRegeneratingTitle(false);
    }
  };

  const handleRegenerateScript = async () => {
    try {
      if (!videoSettings) return;
      setIsRegeneratingScript(true);
      
      const videoId = params.id as string;
      if (!videoId) {
        throw new Error('No se encontró el ID del video');
      }

      const response = await fetch('/api/openai/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          generationId: videoId,
          videoData: {
            duration: videoSettings.duration,
            tone: videoSettings.tone,
            topic: videoSettings.topic,
            description: videoSettings.description,
            videoTitle: videoSettings.videoTitle
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Error al regenerar el script');
      }

      const data = await response.json();
      
      // Actualizar el estado local
      setVideoSettings({
        ...videoSettings,
        script: data.script
      });

      toast.success('Script regenerado correctamente');
    } catch (error) {
      toast.error('Error al regenerar el script');
      console.error('Error:', error);
    } finally {
      setIsRegeneratingScript(false);
    }
  };

  const handleRegenerateSocial = async () => {
    try {
      if (!videoSettings) return;
      setIsRegeneratingSocial(true);
      // Generar short copy
      const shortCopyResponse = await fetch('/api/openai/generate-short-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: params.id,
          script: videoSettings.script,
        }),
      });
      if (!shortCopyResponse.ok) {
        const text = await shortCopyResponse.text();
        console.error('Respuesta del servidor:', text);
        throw new Error('Error al generar el short copy');
      }
      const shortCopyData = await shortCopyResponse.json();
      // Generar long copy
      const longCopyResponse = await fetch('/api/openai/generate-long-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: params.id,
          script: videoSettings.script,
        }),
      });
      if (!longCopyResponse.ok) {
        throw new Error('Error al generar el long copy');
      }
      const longCopyData = await longCopyResponse.json();
      // Guardar en completion_results_videos
      const completionRef = doc(db, 'completion_results_videos', params.id as string);
      await setDoc(completionRef, {
        shortCopy: shortCopyData.shortCopy,
        longCopy: longCopyData.longCopy,
        updatedAt: serverTimestamp()
      }, { merge: true });
      // Actualizar el estado local
      setVideoSettings({
        ...videoSettings,
        shortCopy: shortCopyData.shortCopy,
        longCopy: longCopyData.longCopy
      });
      toast.success('Copys sociales regenerados exitosamente');
    } catch (error) {
      toast.error('Error al regenerar los copys sociales');
      console.error('Error:', error);
    } finally {
      setIsRegeneratingSocial(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando configuración del video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!videoSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Video no encontrado</h2>
          <p className="text-muted-foreground">No se encontró la configuración del video solicitado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-foreground">Vista Previa del Video</h1>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </div>

          <div className="space-y-6">
            {/* Información básica */}
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Información Básica</h2>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="videoTitle">Título del Video</Label>
                  <Input
                    id="videoTitle"
                    value={videoSettings.videoTitle}
                    onChange={(e) => setVideoSettings({ ...videoSettings, videoTitle: e.target.value })}
                    className="mt-1 border border-muted-foreground/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <div className="mt-2">
                    <Button
                      className="w-full"
                      onClick={handleRegenerateTitle}
                      disabled={isRegeneratingTitle}
                    >
                      {isRegeneratingTitle ? 'Regenerando...' : 'Regenerar con IA'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    Puedes editar el título manualmente o pedirle a la IA que lo regenere.
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido generado */}
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Contenido Generado</h2>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="script">Guion</TabsTrigger>
                  <TabsTrigger value="social">Contenido Social</TabsTrigger>
                </TabsList>
                <TabsContent value="script" className="mt-4">
                  {videoSettings.script ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Guion Generado</Label>
                        <Button
                          onClick={handleRegenerateScript}
                          variant="outline"
                          size="sm"
                          disabled={isRegeneratingScript}
                        >
                          {isRegeneratingScript ? 'Regenerando...' : 'Regenerar Guion'}
                        </Button>
                      </div>
                      <Textarea
                        value={videoSettings.script}
                        onChange={(e) => setVideoSettings({ ...videoSettings, script: e.target.value })}
                        className="min-h-[300px] font-mono"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-muted-foreground mb-4">
                        <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">No hay guion generado aún</p>
                        <p className="text-sm">El guion se generará automáticamente cuando se complete el formulario de video.</p>
                      </div>
                      <Button
                        onClick={handleRegenerateScript}
                        variant="outline"
                        disabled={isRegeneratingScript}
                      >
                        {isRegeneratingScript ? 'Generando...' : 'Generar Guion Manualmente'}
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="social" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Contenido Social</h3>
                      <button
                        onClick={handleRegenerateSocial}
                        disabled={isRegeneratingSocial}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isRegeneratingSocial ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Regenerando...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Regenerar con IA
                          </>
                        )}
                      </button>
                    </div>
                    <div className="space-y-4">
                      {/* Copy Corto */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Copy Corto (TikTok/Reels)
                        </label>
                        <textarea
                          value={videoSettings?.shortCopy?.content ?? ''}
                          onChange={(e) => {
                            if (!videoSettings) return;
                            setVideoSettings({
                              ...videoSettings,
                              shortCopy: {
                                platform: 'TikTok/Reels',
                                content: e.target.value
                              }
                            });
                          }}
                          className="w-full h-32 p-3 bg-card border border-input rounded-lg text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                          placeholder="El copy corto se generará automáticamente después de generar el guion..."
                        />
                      </div>

                      {/* Copy Largo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Copy Largo (Facebook/LinkedIn)
                        </label>
                        <textarea
                          value={videoSettings?.longCopy?.content ?? ''}
                          onChange={(e) => {
                            if (!videoSettings) return;
                            setVideoSettings({
                              ...videoSettings,
                              longCopy: {
                                platform: 'Facebook/LinkedIn',
                                content: e.target.value
                              }
                            });
                          }}
                          className="w-full h-32 p-3 bg-card border border-input rounded-lg text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                          placeholder="El copy largo se generará automáticamente después de generar el guion..."
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 