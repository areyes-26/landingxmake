// File: src/app/export-view/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, ArrowLeft, Instagram } from 'lucide-react';
import { SiTiktok } from 'react-icons/si';
import type { VideoData } from '@/types/video';

export default function ExportViewPage() {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [downloadHover, setDownloadHover] = useState(false);
  const searchParams = useSearchParams();
  const videoId = searchParams.get('id');

  useEffect(() => {
    if (!videoId) {
      toast.error('No se proporcionó un ID de video');
      return;
    }

    // Escuchar el documento de videos para actualizaciones en tiempo real
    const videoRef = doc(db, 'videos', videoId);
    const unsubscribe = onSnapshot(videoRef, (docSnap) => {
      if (!docSnap.exists()) {
        toast.error('Video no encontrado');
        return;
      }
      const data = docSnap.data() as VideoData;
      setVideoData((prev) => ({ ...prev, ...data, id: docSnap.id }));
    });

    // Fetch a /api/videos/[id] para obtener los copys
    const fetchCopys = async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}`);
        if (!res.ok) return;
        const data = await res.json();
        setVideoData((prev) => ({ ...prev, ...data, id: videoId }));
      } catch (err) {
        // No mostrar error, solo loguear
        console.error('No se pudieron obtener los copys:', err);
      }
    };
    fetchCopys();

    return () => unsubscribe();
  }, [videoId]);

  useEffect(() => {
    if (videoData) {
      console.log('[ExportView] videoData:', videoData);
      console.log('shortCopy:', videoData.shortCopy);
      console.log('longCopy:', videoData.longCopy);
    }
  }, [videoData]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      // TODO: Implementar lógica de exportación aquí
      toast.success('Exportación iniciada con éxito.');
    } catch (error) {
      console.error('Error en exportación:', error);
      toast.error('Error al iniciar la exportación.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Texto copiado al portapapeles');
  };

  const handleDownload = async () => {
    if (!videoData?.heygenResults?.videoUrl) {
      toast.error('No hay video disponible para descargar');
      return;
    }

    try {
      const response = await fetch(videoData.heygenResults.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoData.videoTitle}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Descarga iniciada');
    } catch (error) {
      console.error('Error al descargar el video:', error);
      toast.error('Error al descargar el video');
    }
  };

  if (!videoData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando video...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Botón de retorno */}
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Dashboard
          </Button>

          <div className="flex justify-between items-center mb-6">
            {/* Eliminar título y botón Exportar */}
          </div>

          <div className="space-y-6">
            {/* Vista previa del video y opciones de exportación en un flex */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Vista previa del video */}
              <Card className="flex-1 flex flex-col justify-between">
                <CardHeader>
                  <CardTitle>Vista Previa del Video</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-center">
                  {videoData.heygenResults?.videoUrl ? (
                    <div className="relative w-full max-w-[360px] mx-auto">
                      <div className="aspect-[9/16] w-full bg-black rounded-lg overflow-hidden">
                        <video
                          src={videoData.heygenResults.videoUrl}
                          controls
                          className="w-full h-full object-cover"
                          poster={videoData.thumbnailUrl}
                        >
                          Tu navegador no soporta el elemento de video.
                        </video>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full max-w-[360px] mx-auto">
                      <div className="aspect-[9/16] w-full bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">No hay video disponible</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              {/* Columna derecha: Opciones de exportación + Copys */}
              <div className="flex flex-col w-full max-w-xs h-full gap-6">
                {/* Opciones de exportación compactas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Opciones de Exportación</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      className="w-full"
                      onClick={handleDownload}
                      disabled={!videoData.heygenResults?.videoUrl}
                      onMouseEnter={() => setDownloadHover(true)}
                      onMouseLeave={() => setDownloadHover(false)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar Video
                    </Button>
                    {downloadHover && (
                      <p className="text-sm text-muted-foreground">
                        El video se descargara en formato MP4
                      </p>
                    )}
                    <div className="flex flex-col gap-3">
                      <Button
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 text-white border-0 hover:brightness-110"
                        style={{ boxShadow: '0 2px 8px 0 rgba(225,48,108,0.15)' }}
                        variant="default"
                        disabled
                      >
                        <Instagram className="w-4 h-4" />
                        Compartir en Instagram
                      </Button>
                      <Button
                        className="w-full flex items-center justify-center gap-2 bg-black text-white border-0 hover:bg-gray-900"
                        style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.15)' }}
                        variant="default"
                        disabled
                      >
                        <SiTiktok className="w-4 h-4" />
                        Compartir en TikTok
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                {/* Copys para redes sociales */}
                <Card className="flex-1 flex flex-col">
                  <CardHeader>
                    <CardTitle>Copys para Redes Sociales</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <Tabs defaultValue="tiktok" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="tiktok">TikTok/Reels</TabsTrigger>
                        <TabsTrigger value="facebook">Facebook/LinkedIn</TabsTrigger>
                      </TabsList>
                      <TabsContent value="tiktok" className="space-y-4">
                        <div className="relative">
                          <textarea
                            readOnly
                            value={videoData.shortCopy?.content || 'No hay copy disponible'}
                            className="w-full h-32 p-3 bg-muted rounded-lg resize-none"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => handleCopyText(videoData.shortCopy?.content || '')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {videoData.socialContent?.socialCopies && (
                          <div className="space-y-2">
                            <h3 className="font-medium">Copys Generados:</h3>
                            {videoData.socialContent.socialCopies
                              .filter(copy => copy.platform.toLowerCase().includes('tiktok') || copy.platform.toLowerCase().includes('reels'))
                              .map((copy, index) => (
                                <div key={index} className="relative bg-muted/50 p-3 rounded-lg">
                                  <p className="text-sm">{copy.content}</p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={() => handleCopyText(copy.content)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                      </TabsContent>
                      <TabsContent value="facebook" className="space-y-4">
                        <div className="relative">
                          <textarea
                            readOnly
                            value={videoData.longCopy?.content || 'No hay copy disponible'}
                            className="w-full h-32 p-3 bg-muted rounded-lg resize-none"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={() => handleCopyText(videoData.longCopy?.content || '')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        {videoData.socialContent?.socialCopies && (
                          <div className="space-y-2">
                            <h3 className="font-medium">Copys Generados:</h3>
                            {videoData.socialContent.socialCopies
                              .filter(copy => copy.platform.toLowerCase().includes('facebook') || copy.platform.toLowerCase().includes('linkedin'))
                              .map((copy, index) => (
                                <div key={index} className="relative bg-muted/50 p-3 rounded-lg">
                                  <p className="text-sm">{copy.content}</p>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2"
                                    onClick={() => handleCopyText(copy.content)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}