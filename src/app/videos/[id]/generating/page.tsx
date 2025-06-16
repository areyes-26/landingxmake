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
    
    const unsubscribe = onSnapshot(videoRef, async (doc) => {
      if (!doc.exists()) {
        setError('Video no encontrado');
        setStatus('failed');
        return;
      }

      const videoData = doc.data();
      
      // Si el video está listo, redirigir a export-view
      if (videoData.status === 'completed' && videoData.heygenResults?.videoUrl) {
        toast.success('¡Video generado exitosamente!');
        router.push(`/export-view?id=${params.id}`);
        setStatus('completed');
        setVideoId(params.id);
        return;
      }
      
      // Si hay un error, mostrarlo solo si no está en proceso
      if (videoData.status === 'error' && videoData.heygenResults?.status !== 'generating') {
        const errorMessage = videoData.error || 'Error al generar el video';
        setError(errorMessage);
        toast.error(errorMessage);
        setStatus('failed');
        return;
      }

      // Si tenemos un taskId y el video está en proceso, iniciar el polling
      if (videoData.heygenResults?.taskId && videoData.status === 'processing') {
        setTaskId(videoData.heygenResults.taskId);
        setStatus('processing');
      }
    }, (error) => {
      // Solo mostrar errores de conexión con Firestore
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
        const response = await fetch(`/api/heygen/check-status?videoId=${params.id}&taskId=${taskId}`);
        if (!response.ok) {
          const errorData = await response.json();
          // Solo mostrar el error en consola, no en la UI
          console.error('Error en el polling:', errorData.error);
          return;
        }
        setPollingCount(prev => prev + 1);
      } catch (error) {
        // Solo mostrar el error en consola, no en la UI
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
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