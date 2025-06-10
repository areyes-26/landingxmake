'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatFirestoreDate } from '@/utils/date';
import { VideoData } from '@/types/video';

export default function HistoryPage() {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoList: VideoData[] = [];
      snapshot.forEach((doc) => {
        videoList.push({
          id: doc.id,
          ...doc.data(),
        } as VideoData);
      });
      setVideos(videoList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="container mx-auto p-6">Cargando historial...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Historial de Videos</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <Card key={video.id}>
            <CardHeader>
              <CardTitle>{video.videoTitle}</CardTitle>
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
        ))}
      </div>
    </div>
  );
} 