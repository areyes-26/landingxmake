'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { VideoData } from '@/types/video';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  useEffect(() => {
    // Esperamos a que la autenticación termine de cargar
    if (authLoading) return;

    // Si no hay usuario, redirigimos al login
    if (!user) {
      router.replace('/auth/login');
      return;
    }

    const videosRef = collection(db, 'videos');
    const q = query(
      videosRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    console.log('[Dashboard] Consultando videos para usuario:', user.uid);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('[Dashboard] Snapshot recibido, tamaño:', snapshot.size);
      const videoList: VideoData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('[Dashboard] Video encontrado:', {
          id: doc.id,
          status: data.status || data.estado,
          userId: data.userId,
          createdAt: data.createdAt?.toDate() || data.fechaCreacion?.toDate(),
          videoTitle: data.videoTitle || data.titulo,
          heygenResults: data.heygenResults
        });
        
        // Normalizar los campos
        const normalizedData = {
          ...data,
          status: data.status || data.estado,
          createdAt: data.createdAt || data.fechaCreacion,
          videoTitle: data.videoTitle || data.titulo,
          description: data.description || data.descripcion
        };
        
        videoList.push({ id: doc.id, ...normalizedData } as VideoData);
      });
      console.log('[Dashboard] Total de videos cargados:', videoList.length);
      setVideos(videoList);
      setLoading(false);
    }, (error) => {
      console.error('[Dashboard] Error al cargar los videos:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, router, authLoading]);

  const getStatusBadge = (status: string, count: number) => {
    const isSelected = selectedStatus === status;
    const baseClasses = "cursor-pointer transition-colors";
    const statusClasses = {
      completed: "bg-green-500 hover:bg-green-600",
      processing: "bg-yellow-500 hover:bg-yellow-600",
      error: "bg-red-500 hover:bg-red-600",
      pending: "bg-gray-500 hover:bg-gray-600",
      all: "bg-blue-500 hover:bg-blue-600"
    };

    return (
      <Badge 
        className={`${baseClasses} ${statusClasses[status as keyof typeof statusClasses]} ${isSelected ? 'ring-2 ring-offset-2 ring-offset-background ring-ring' : ''}`}
        onClick={() => setSelectedStatus(status === selectedStatus ? null : status)}
      >
        {status === 'all' ? 'Todos' : 
         status === 'completed' ? 'Completados' :
         status === 'processing' ? 'En proceso' :
         status === 'error' ? 'Error' : 'Pendientes'}: {count}
      </Badge>
    );
  };

  const handleVideoClick = (video: VideoData) => {
    if (video.status === 'completed') {
      router.push(`/export-view?id=${video.id}`);
    } else if (video.status === 'processing') {
      router.push(`/videos/${video.id}/generating`);
    } else {
      router.push(`/videos/${video.id}`);
    }
  };

  const filteredVideos = selectedStatus && selectedStatus !== 'all' 
    ? videos.filter(v => v.status === selectedStatus)
    : videos;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Mis Videos</h1>
            <div className="flex gap-4 mt-2">
              {getStatusBadge('all', videos.length)}
              {getStatusBadge('completed', videos.filter(v => v.status === 'completed').length)}
              {getStatusBadge('processing', videos.filter(v => v.status === 'processing').length)}
              {getStatusBadge('error', videos.filter(v => v.status === 'error').length)}
              {getStatusBadge('pending', videos.filter(v => v.status === 'pending').length)}
            </div>
          </div>
          <Button onClick={() => router.push('/')}>
            Crear Nuevo Video
          </Button>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">No tienes videos aún</h2>
            <p className="text-muted-foreground mb-6">
              Comienza creando tu primer video para generar contenido impactante.
            </p>
            <Button onClick={() => router.push('/')}>
              Crear mi Primer Video
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video) => (
              <Card
                key={video.id}
                className={`cursor-pointer hover:shadow-lg transition-shadow ${
                  video.status === 'error' ? 'border-red-500' :
                  video.status === 'processing' ? 'border-yellow-500' :
                  video.status === 'completed' ? 'border-green-500' :
                  'border-gray-500'
                }`}
                onClick={() => handleVideoClick(video)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="line-clamp-2">{video.videoTitle}</CardTitle>
                  </div>
                  <CardDescription>
                    {new Date(video.createdAt.toDate()).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {video.description}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVideoClick(video);
                    }}
                  >
                    {video.status === 'completed' ? 'Ver Video' : 'Ver Detalles'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 