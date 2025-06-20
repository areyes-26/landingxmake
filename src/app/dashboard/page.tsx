'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VideoData } from '@/types/video';
import { useAuth } from '@/hooks/useAuth';
import CreditCounter from '@/components/CreditCounter';
import styles from './dashboard.module.css';

// Helper function to format dates
const formatDate = (date: any) => {
  if (!date) return 'No date';
  const d = date.toDate ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('newest');
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [videoToDownload, setVideoToDownload] = useState<VideoData | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch videos from Firestore
  useEffect(() => {
    if (!user) {
      if (!authLoading) router.replace('/auth');
      return;
    }

    const videosQuery = query(
      collection(db, 'videos'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(videosQuery, (snapshot) => {
      const videoList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as VideoData));
      setVideos(videoList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching videos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router]);

  // Handle closing menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest(`[data-menu-id="${openMenuId}"]`)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  // Filter and sort videos
  const processedVideos = videos
    .filter(video => activeFilter === 'all' || video.status === activeFilter)
    .sort((a, b) => {
      switch (sortOrder) {
        case 'oldest':
          return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        case 'title':
          return (a.videoTitle || '').localeCompare(b.videoTitle || '');
        case 'status':
          return (a.status || '').localeCompare(b.status || '');
        case 'newest':
        default:
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
    });

  const statusCounts = videos.reduce((acc, video) => {
    const status = video.status || 'pending';
    if (status in acc) {
      acc[status as keyof typeof acc]++;
    }
    acc.all++;
    return acc;
  }, { all: 0, completed: 0, processing: 0, error: 0, pending: 0 });
  
  const handleDeleteClick = (videoId: string) => {
    setVideoToDelete(videoId);
    setShowDeleteModal(true);
    setOpenMenuId(null); // Close the dropdown menu
  };

  const confirmDelete = async () => {
    if (!videoToDelete) return;
    try {
        await deleteDoc(doc(db, 'videos', videoToDelete));
    } catch (error) {
        console.error("Error deleting video: ", error);
        alert('Failed to delete video.');
    } finally {
        setShowDeleteModal(false);
        setVideoToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setVideoToDelete(null);
  };

  const handleDownloadClick = (video: VideoData) => {
    if (video.videoUrl) {
      setVideoToDownload(video);
      setShowDownloadModal(true);
      setOpenMenuId(null);
    } else {
      alert("Video is not available for download yet.");
    }
  };

  const confirmDownload = async () => {
    if (!videoToDownload?.videoUrl) {
      console.error('No video available for download');
      setShowDownloadModal(false);
      setVideoToDownload(null);
      return;
    }

    try {
      const response = await fetch(videoToDownload.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoToDownload.videoTitle || 'video'}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading the video:', error);
      alert('Error downloading the video');
    } finally {
      setShowDownloadModal(false);
      setVideoToDownload(null);
    }
  };

  const cancelDownload = () => {
    setShowDownloadModal(false);
    setVideoToDownload(null);
  };

  const handleViewDetails = (video: VideoData) => {
    if (video.status === 'completed') {
      router.push(`/export-view?id=${video.id}`);
    } else if (video.status === 'processing') {
      router.push(`/videos/${video.id}/generating`);
    } else {
      router.push(`/videos/${video.id}`);
    }
  };

  if (authLoading || loading) {
    return <div>Loading...</div>; // Replace with a proper skeleton loader if desired
  }

    return (
    <>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitleSection}>
            <h1 className={styles.pageTitle}>My Videos</h1>
          </div>
          
          <div className={styles.statusFilters}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div 
                key={status}
                className={`${styles.statusFilter} ${activeFilter === status ? styles.active : ''} ${styles[status]}`}
                onClick={() => setActiveFilter(status)}
              >
                {`${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.controlsLeft}>
            <select className={styles.sortSelect} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A-Z</option>
              <option value="status">By status</option>
              </select>
          </div>
          <div className={styles.actionButtons}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} disabled>Avatar Test</button>
            <Link href="/video-forms" className={`${styles.btn} ${styles.btnPrimary}`}>Create New Video</Link>
          </div>
        </div>

        <div className={styles.videosGrid}>
          {processedVideos.length > 0 ? (
            processedVideos.map(video => (
              <div key={video.id} className={styles.videoCard}>
                <div className={styles.videoHeader}>
                  <h3 className={styles.videoTitle}>{video.videoTitle}</h3>
                  <div className={styles.videoMenu} data-menu-id={video.id}>
                    <button className={styles.menuTrigger} onClick={() => setOpenMenuId(openMenuId === video.id ? null : video.id)}>⋯</button>
                    {openMenuId === video.id && (
                       <div className={`${styles.dropdownMenu} ${styles.show}`}>
                        <div className={styles.dropdownItem} onClick={() => handleDownloadClick(video)}>⬇ Download</div>
                        <div className={`${styles.dropdownItem} ${styles.delete}`} onClick={() => handleDeleteClick(video.id)}>🗑 Delete</div>
                        </div>
                      )}
                    </div>
                  </div>
                <div className={styles.videoMeta}>
                  <div className={styles.videoDate}>{formatDate(video.createdAt)}</div>
                  <div className={styles.videoDescription}>{video.description}</div>
                  <span className={`${styles.videoStatus} ${styles[`status${video.status?.charAt(0).toUpperCase() + video.status?.slice(1)}`]}`}>
                    {video.status}
                  </span>
                </div>
                <div className={styles.videoActions}>
                    <button onClick={() => handleViewDetails(video)} className={`${styles.actionBtn} ${video.status === 'completed' ? styles.actionBtnPrimary : styles.actionBtnSecondary}`}>View Details</button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🎬</div>
              <h2>No videos found</h2>
              <p>Start by creating a new video.</p>
          </div>
        )}
        </div>
      </div>
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Delete Video</h2>
            <p className={styles.modalText}>Are you sure you want to delete this video? This action cannot be undone.</p>
            <div className={styles.modalActions}>
              <button onClick={cancelDelete} className={`${styles.btn} ${styles.btnSecondary}`}>Cancel</button>
              <button onClick={confirmDelete} className={`${styles.btn} ${styles.btnDelete}`}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {showDownloadModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <p className={styles.modalText}>Your video will be downloaded in MP4 format.</p>
            <div className={styles.modalActions}>
              <button onClick={cancelDownload} className={`${styles.btn} ${styles.btnSecondary}`}>Cancel</button>
              <button onClick={confirmDownload} className={`${styles.btn} ${styles.btnPrimary}`}>Download</button>
            </div>
          </div>
    </div>
      )}
    </>
  );
} 