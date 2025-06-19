'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VideoData } from '@/types/video';

export default function VideoSettingsPreview() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isRegeneratingTitle, setIsRegeneratingTitle] = useState(false);
  const [isRegeneratingSocial, setIsRegeneratingSocial] = useState(false);
  const [isRegeneratingScript, setIsRegeneratingScript] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [videoSettings, setVideoSettings] = useState<VideoData | null>(null);
  const [activeTab, setActiveTab] = useState('script');

  useEffect(() => {
    const videoId = searchParams.get('id');
    console.log('🔄 useEffect triggered with videoId:', videoId);
    
    if (videoId) {
      console.log('🚀 Loading video settings for ID:', videoId);
      fetchVideoSettings(videoId);
    } else {
      console.log('❌ No video ID found in search params');
      setIsLoading(false);
      setError('No se encontró el ID del video');
    }
  }, [searchParams]);

  // Efecto adicional para recargar datos si el video está en estado "pending" o "processing"
  useEffect(() => {
    if (videoSettings && (videoSettings.status === 'pending' || videoSettings.status === 'processing')) {
      console.log('⏳ Video en estado pending/processing, recargando en 3 segundos...');
      const timer = setTimeout(() => {
        const videoId = searchParams.get('id');
        if (videoId) {
          fetchVideoSettings(videoId);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [videoSettings?.status, searchParams]);

  const fetchVideoSettings = async (videoId: string) => {
    try {
      setIsLoading(true);
      console.log('🔍 Fetching video settings for ID:', videoId);
      
      const response = await fetch(`/api/videos/${videoId}`);
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Error al cargar la configuración del video');
        if (data.details) setError(prev => prev + ' - ' + data.details);
        throw new Error(data.error || 'Error al cargar la configuración del video');
      }
      const data = await response.json();
      
      console.log('📦 Video data loaded:', data);
      console.log('📝 Script data:', data.script);
      console.log('📱 Short copy data:', data.shortCopy);
      console.log('📄 Long copy data:', data.longCopy);
      console.log('🎯 Video status:', data.status);
      
      // Verificar si los datos están presentes
      if (data.script) {
        console.log('✅ Script encontrado, longitud:', data.script.length);
      } else {
        console.log('❌ No hay script');
      }
      
      if (data.shortCopy) {
        console.log('✅ Short copy encontrado:', data.shortCopy);
      } else {
        console.log('❌ No hay short copy');
      }
      
      if (data.longCopy) {
        console.log('✅ Long copy encontrado:', data.longCopy);
      } else {
        console.log('❌ No hay long copy');
      }
      
      setVideoSettings(data);
    } catch (error) {
      toast.error('Error al cargar la configuración del video');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!videoSettings) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/videos/${searchParams.get('id')}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(videoSettings),
      });

      if (!response.ok) {
        throw new Error('Error al guardar los cambios');
      }

      toast.success('Cambios guardados correctamente');
    } catch (error) {
      toast.error('Error al guardar los cambios');
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateTitle = async () => {
    if (!videoSettings) return;

    try {
      setIsRegeneratingTitle(true);
      const videoId = searchParams.get('id');
      if (!videoId) {
        throw new Error('No se encontró el ID del video');
      }

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
          videoId: videoId
        }),
      });

      if (!response.ok) {
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
      
      const videoId = searchParams.get('id');
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

      const videoId = searchParams.get('id');
      if (!videoId) {
        throw new Error('No se encontró el ID del video');
      }

      // Generar short copy
      const shortCopyResponse = await fetch('/api/openai/generate-short-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          script: videoSettings.script,
        }),
      });

      if (!shortCopyResponse.ok) {
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
          videoId,
          script: videoSettings.script,
        }),
      });

      if (!longCopyResponse.ok) {
        throw new Error('Error al generar el long copy');
      }

      const longCopyData = await longCopyResponse.json();

      // Guardar en completion_results_videos
      const completionRef = doc(db, 'completion_results_videos', videoId);
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
      console.error('Error:', error);
      toast.error('Error al regenerar los copys sociales');
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
                        {videoSettings.shortCopy?.content ? (
                          <textarea
                            value={videoSettings.shortCopy.content}
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
                          />
                        ) : (
                          <div className="w-full h-32 p-3 bg-muted/50 border border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <p className="text-sm">No hay copy corto generado aún</p>
                              <p className="text-xs">Se generará automáticamente con el guion</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Copy Largo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Copy Largo (Facebook/LinkedIn)
                        </label>
                        {videoSettings.longCopy?.content ? (
                          <textarea
                            value={videoSettings.longCopy.content}
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
                          />
                        ) : (
                          <div className="w-full h-32 p-3 bg-muted/50 border border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <p className="text-sm">No hay copy largo generado aún</p>
                              <p className="text-xs">Se generará automáticamente con el guion</p>
                            </div>
                          </div>
                        )}
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