'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFirestoreDate } from '@/utils/date';
import { VideoData } from '@/types/video';

interface VideoPageProps {
  params: {
    id: string;
  };
}

export default function VideoPage({ params }: VideoPageProps) {
  const [video, setVideo] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'videos', params.id), (doc) => {
      if (doc.exists()) {
        setVideo({
          id: doc.id,
          ...doc.data(),
        } as VideoData);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [params.id]);

  if (loading) {
    return <div className="container mx-auto p-6">Cargando video...</div>;
  }

  if (!video) {
    return <div className="container mx-auto p-6">Video no encontrado</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{video.videoTitle}</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Detalles del Video</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p><strong>Descripción:</strong> {video.description}</p>
              <p><strong>Tema:</strong> {video.topic}</p>
              <p><strong>Tono:</strong> {video.tone}</p>
              <p><strong>Estado:</strong> {video.status}</p>
              <p><strong>Creado:</strong> {formatFirestoreDate(video.createdAt)}</p>
              <p><strong>Actualizado:</strong> {formatFirestoreDate(video.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 