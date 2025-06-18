'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import Link from 'next/link';

export default function VideoGeneratingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);
  const [status, setStatus] = useState<string>('waiting');
  const [videoId, setVideoId] = useState<string>(params.id);

  useEffect(() => {
    const videoRef = doc(db, 'videos', params.id);
    
    const unsubscribe = onSnapshot(videoRef, (doc) => {
      if (!doc.exists()) {
        setError('Video no encontrado');
        setStatus('failed');
        return;
      }

      const videoData = doc.data();
      console.log('Estado actual del video:', videoData.status, 'HeyGen status:', videoData.heygenResults?.status);
      
      // Si el video está listo, redirigir a export-view
      if (videoData.status === 'completed' && videoData.heygenResults?.videoUrl) {
        console.log('Video completado, redirigiendo a export-view');
        toast.success('¡Video generado exitosamente!');
        router.push(`/export-view?id=${params.id}`);
        setStatus('completed');
        setVideoId(params.id);
        return;
      }
      
      // Si hay un error, mostrarlo solo si no está en proceso
      if (videoData.status === 'error' && videoData.heygenResults?.status !== 'generating') {
        const errorMessage = videoData.error || 'Error al generar el video';
        console.error('Error en la generación del video:', errorMessage);
        setError(errorMessage);
        toast.error(errorMessage);
        setStatus('failed');
        return;
      }

      // Si el video está en proceso, iniciar el polling
      if (videoData.status === 'processing') {
        const heygenVideoId = videoData.heygenResults?.videoId;
        if (!heygenVideoId) {
          console.error('No se encontró el ID de video de HeyGen');
          setError('Error: No se encontró el ID de video de HeyGen');
          setStatus('failed');
          return;
        }
        console.log('Iniciando polling con HeyGen video_id:', heygenVideoId);
        setTaskId(heygenVideoId);
        setStatus('processing');
      }
    }, (error) => {
      console.error('Error al monitorear el estado del video:', error);
      if (error.code === 'permission-denied' || error.code === 'unavailable') {
        const errorMessage = 'Error de conexión al monitorear el video';
        setError(errorMessage);
        toast.error(errorMessage);
        setStatus('failed');
      }
    });

    return () => unsubscribe();
  }, [params.id, router]);

  // Efecto para el polling del estado del video
  useEffect(() => {
    if (!taskId) return;

    const checkStatus = async () => {
      try {
        console.log('Consultando estado del video:', params.id, 'taskId:', taskId);
        const response = await fetch(`/api/heygen/check-status?videoId=${params.id}&taskId=${taskId}`);
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error en el polling:', errorData.error);
          return;
        }
        const data = await response.json();
        console.log('Respuesta del polling:', data);
        setPollingCount(prev => prev + 1);
      } catch (error) {
        console.error('Error en el polling:', error);
      }
    };

    // Verificar el estado cada 30 segundos
    const interval = setInterval(checkStatus, 30000);
    
    // Verificar inmediatamente al montar el componente
    checkStatus();

    return () => clearInterval(interval);
  }, [taskId, params.id]);

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'El video está en la cola de procesamiento. Esto puede tomar unos minutos...';
      case 'processing':
        return 'El video se está generando. Esto puede tomar unos minutos...';
      case 'completed':
        return '¡El video se ha generado exitosamente!';
      case 'failed':
        return 'Hubo un error al generar el video. Por favor, intenta nuevamente.';
      default:
        return 'Verificando el estado del video...';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {getStatusMessage(status)}
          </h1>
          
          {status === 'waiting' || status === 'processing' ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="text-gray-600">
                {status === 'waiting' 
                  ? 'Tu video está en la cola de procesamiento. Esto puede tomar unos minutos...'
                  : 'Generando tu video. Esto puede tomar unos minutos...'}
              </p>
            </div>
          ) : status === 'completed' ? (
            <div className="space-y-4">
              <p className="text-green-600 font-medium">¡Video generado exitosamente!</p>
              <Link
                href={`/videos/${videoId}`}
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver Video
              </Link>
            </div>
          ) : status === 'failed' ? (
            <div className="space-y-4">
              <p className="text-red-600 font-medium">Error al generar el video</p>
              <p className="text-gray-600">{error}</p>
              <Link
                href="/"
                className="inline-block bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Volver al Inicio
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
} 