'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import type { VideoData } from '@/types/video';
import { MoreVertical } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoList: VideoData[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('[Dashboard] Firestore raw doc:', doc.id, data);
        // Preservar el estado original del documento
        const normalizedData = {
          ...data,
          status: data.status || 'pending', // Si no hay estado, asumimos que está pendiente
          createdAt: data.createdAt || data.fechaCreacion,
          videoTitle: data.videoTitle || data.titulo || 'Untitled Video',
          description: data.description || data.descripcion || ''
        };
        console.log('[Dashboard] Normalized video:', doc.id, normalizedData);
        videoList.push({ id: doc.id, ...normalizedData } as VideoData);
      });
      setVideos(videoList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching videos:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, router, authLoading]);

  // Ordenar los videos localmente según la selección
  const orderedVideos = [...videos].sort((a, b) => {
    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
    if (order === 'desc') {
      return dateB.getTime() - dateA.getTime();
    } else {
      return dateA.getTime() - dateB.getTime();
    }
  });

  // Ajustar el conteo y el filtro de 'Pendientes'
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
        {status === 'all' ? 'All' : 
         status === 'completed' ? 'Completed' :
         status === 'processing' ? 'Processing' :
         status === 'error' ? 'Error' : 'Pending'}: {count}
      </Badge>
    );
  };

  // Ajustar el filtro de videos
  const filteredVideos = selectedStatus && selectedStatus !== 'all' 
    ? orderedVideos.filter(v => v.status === selectedStatus)
    : orderedVideos;

  const handleVideoClick = (video: VideoData) => {
    console.log('[Dashboard] handleVideoClick:', video.id, 'status:', video.status);
    if (video.status === 'completed') {
      router.push(`/export-view?id=${video.id}`);
    } else if (video.status === 'processing') {
      router.push(`/videos/${video.id}/generating`);
    } else {
      router.push(`/videos/${video.id}`);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    setVideoToDelete(videoId);
    setShowDeleteModal(true);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    try {
      await deleteDoc(doc(db, 'videos', videoToDelete));
      setMenuOpenId(null);
      setShowDeleteModal(false);
      setVideoToDelete(null);
    } catch (error) {
      alert('Error deleting video.');
    }
  };

  const cancelDeleteVideo = () => {
    setShowDeleteModal(false);
    setVideoToDelete(null);
  };

  const getCardButtonLabel = (video: VideoData) => {
    if (video.status === 'completed') return 'View Video';
    if (video.status === 'processing') return 'Processing';
    if (video.status === 'error') return 'Error';
    return 'View Details';
  };

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
            <h1 className="text-3xl font-bold">My Videos</h1>
            <div className="flex gap-4 mt-2">
              {getStatusBadge('all', videos.length)}
              {getStatusBadge('completed', videos.filter(v => v.status === 'completed').length)}
              {getStatusBadge('processing', videos.filter(v => v.status === 'processing').length)}
              {getStatusBadge('error', videos.filter(v => v.status === 'error').length)}
              {getStatusBadge('pending', videos.filter(v => v.status === 'pending').length)}
            </div>
            <div className="mt-4">
              <label htmlFor="order-select" className="mr-2 font-medium text-muted-foreground">Order by:</label>
              <select
                id="order-select"
                value={order}
                onChange={e => setOrder(e.target.value as 'desc' | 'asc')}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-background text-foreground"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => router.push('/video-forms')}>
              Create New Video
            </Button>
            <Button variant="outline" onClick={() => router.push('/admin/avatar-test')}>
              Avatar Test
            </Button>
          </div>
        </div>

        {videos.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold mb-4">Welcome to your Dashboard!</h2>
            <p className="text-muted-foreground mb-6">
              You don't have any videos yet. Start by creating your first video or try an avatar to explore the features.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button onClick={() => router.push('/video-forms')}>
                Create my First Video
              </Button>
              <Button variant="outline" onClick={() => router.push('/admin/avatar-test')}>
                Avatar Test
              </Button>
            </div>
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
                    <div className="relative ml-2" onClick={e => e.stopPropagation()}>
                      <button
                        className="p-1 rounded-full hover:bg-muted/40 focus:outline-none"
                        onClick={() => setMenuOpenId(menuOpenId === video.id ? null : video.id)}
                        aria-label="Options"
                      >
                        <MoreVertical className="w-5 h-5 text-muted-foreground" />
                      </button>
                      {menuOpenId === video.id && (
                        <div className="absolute right-0 mt-2 w-40 bg-card border border-muted-foreground/20 rounded-md shadow-lg z-50">
                          <button
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800"
                            onClick={() => handleDeleteVideo(video.id)}
                          >
                            Delete video
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    {video.createdAt?.toDate 
                      ? new Date(video.createdAt.toDate()).toLocaleDateString()
                      : 'Fecha no disponible'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {video.description}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button
                    variant={video.status === 'completed' ? 'default' : 'outline'}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVideoClick(video);
                    }}
                  >
                    {getCardButtonLabel(video)}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      {/* Modal de confirmación de eliminación (custom, reutilizando estilo de Plans and Pricing) */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-lg flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Delete video</h2>
            <p className="mb-6 text-gray-700 text-center">Are you sure you want to delete this video? This action cannot be undone.</p>
            <div className="flex gap-4 w-full justify-center">
              <Button variant="outline" onClick={cancelDeleteVideo}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteVideo}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 