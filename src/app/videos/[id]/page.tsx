'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VideoData } from '@/types/openai';
import { toast } from 'react-hot-toast';

export default function VideoPreview() {
  const params = useParams();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [script, setScript] = useState<string>('');
  const [socialCopy, setSocialCopy] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        const videoId = params.id as string;
        console.log('Fetching video data for ID:', videoId);
        
        // Obtener datos del video
        const videoRef = doc(db, 'videos', videoId);
        const videoDoc = await getDoc(videoRef);

        if (!videoDoc.exists()) {
          console.log('Video document not found');
          setError('Video no encontrado');
          return;
        }

        const data = videoDoc.data();
        console.log('Video data loaded:', data);
        
        setVideoData(data as VideoData);
        setStatus(data.status || 'pending');

        // Obtener resultados de completions
        const completionRef = doc(db, 'completion_results_videos', videoId);
        const completionDoc = await getDoc(completionRef);

        if (completionDoc.exists()) {
          const completionData = completionDoc.data();
          console.log('Completion data loaded:', completionData);

          if (completionData.script) {
            console.log('Script found:', completionData.script);
            setScript(completionData.script);
          }

          // Combinar los copys si existen
          const socialContent: { socialCopies: { platform: string; content: string }[] } = {
            socialCopies: []
          };

          if (completionData.shortCopy) {
            socialContent.socialCopies.push({ platform: 'platform1', content: completionData.shortCopy });
          }

          if (completionData.longCopy) {
            socialContent.socialCopies.push({ platform: 'platform2', content: completionData.longCopy });
          }

          if (socialContent.socialCopies.length > 0) {
            console.log('Social copies found:', socialContent);
            setSocialCopy(JSON.stringify(socialContent, null, 2));
          }
        }

        // Si el status es 'completed' pero no hay copys sociales, los generamos
        if (data.status === 'completed' && !completionDoc.exists()) {
          console.log('Generating social copy...');
          generateSocialCopy(videoId, data as VideoData);
        } else {
          console.log('Status:', data.status, 'Social copy exists:', completionDoc.exists());
        }
      } catch (error) {
        console.error('Error fetching video data:', error);
        setError('Error al cargar los datos del video');
      }
    };

    fetchVideoData();
  }, [params.id]);

  const generateSocialCopy = async (videoId: string, videoData: VideoData) => {
    try {
      // Generar short copy
      const shortCopyResponse = await fetch('/api/openai/generate-short-copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          script: videoData.script,
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
          script: videoData.script,
        }),
      });

      if (!longCopyResponse.ok) {
        throw new Error('Error al generar el long copy');
      }

      const longCopyData = await longCopyResponse.json();

      // Combinar los copys
      const socialContent: { socialCopies: { platform: string; content: string }[] } = {
        socialCopies: [
          { platform: 'platform1', content: shortCopyData.shortCopy },
          { platform: 'platform2', content: longCopyData.longCopy }
        ]
      };

      // Actualizar el documento en Firestore
      const completionRef = doc(db, 'completion_results_videos', videoId);
      await setDoc(completionRef, {
        shortCopy: shortCopyData.shortCopy,
        longCopy: longCopyData.longCopy,
        socialContent,
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSocialCopy(JSON.stringify(socialContent, null, 2));
      toast.success('Copys sociales generados exitosamente');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al generar los copys sociales');
    }
  };

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (!videoData) {
    return <div className="p-4">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{videoData.videoTitle}</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Script del Video</h2>
        <div className="bg-gray-100 p-4 rounded">
          {script ? (
            <pre className="whitespace-pre-wrap">{script}</pre>
          ) : (
            <p>Generando script...</p>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Copys para Redes Sociales</h2>
        <div className="bg-gray-100 p-4 rounded">
          {socialCopy ? (
            <pre className="whitespace-pre-wrap">{socialCopy}</pre>
          ) : status === 'generating_social_copy' ? (
            <p>Generando copys sociales...</p>
          ) : (
            <p>Los copys sociales aparecerán aquí cuando estén listos.</p>
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500">
        Estado: {status}
      </div>
    </div>
  );
} 