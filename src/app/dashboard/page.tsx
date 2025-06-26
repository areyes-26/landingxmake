'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VideoData } from '@/types/video';
import { useAuth } from '@/hooks/useAuth';
import CreditCounter from '@/components/CreditCounter';
import styles from './dashboard.module.css';
import { Skeleton } from '@/components/ui/skeleton';

// Helper function to format dates
const formatDate = (date: any) => {
  if (!date) return 'No date';
  const d = date.toDate ? date.toDate() : new Date(date);
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
};

const DashboardSkeleton = () => (
  <div className={styles.container}>
    <div className={styles.pageHeader}>
      <div className={styles.pageTitleSection}>
        <Skeleton className="h-12 w-1/3" />
      </div>
      <div className={styles.statusFilters}>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
    <div className={styles.controls}>
      <div className={styles.controlsLeft}>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className={styles.actionButtons}>
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
    <div className={styles.videosGrid}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className={styles.videoCard}>
          <div className={styles.videoHeader}>
            <Skeleton className="h-6 w-3/4" />
          </div>
          <div className={styles.videoMeta}>
            <Skeleton className="h-4 w-1/4 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full mt-1" />
          </div>
          <div className={styles.videoActions}>
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profession, setProfession] = useState('');
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [onboardingSuccess, setOnboardingSuccess] = useState<string | null>(null);

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
    setShowDeleteModal(false);
    setVideoToDelete(null);
    try {
        await deleteDoc(doc(db, 'videos', videoToDelete));
    } catch (error) {
        console.error("Error deleting video: ", error);
        alert('Failed to delete video.');
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

  // Onboarding check
  useEffect(() => {
    if (!user) return;
    const checkProfile = async () => {
      const userRef = doc(db, 'user_data', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        if (!data.firstName || !data.lastName || !data.profession) {
          setFirstName(data.firstName || '');
          setLastName(data.lastName || '');
          setProfession(data.profession || '');
          setShowOnboarding(true);
        }
      }
    };
    checkProfile();
  }, [user]);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setOnboardingLoading(true);
    setOnboardingError(null);
    setOnboardingSuccess(null);
    try {
      const userRef = doc(db, 'user_data', user.uid);
      await updateDoc(userRef, {
        firstName,
        lastName,
        profession,
      });
      setOnboardingSuccess('Profile completed!');
      setTimeout(() => {
        setShowOnboarding(false);
      }, 1000);
    } catch (err: any) {
      setOnboardingError('Error saving profile. Please try again.');
    } finally {
      setOnboardingLoading(false);
    }
  };

  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

    return (
    <>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <div className={styles.pageTitleSection}>
            <h1 className={styles.pageTitle}>My Videos</h1>
          </div>
          
          <div className={styles.statusFilters}>
            {['all', 'completed', 'processing', 'error', 'pending'].map((status) => (
              <div
                key={status}
                className={`${styles.statusFilter} ${activeFilter === status ? styles.active : ''} ${styles[status]} transition-all duration-200`}
                onClick={() => setActiveFilter(status)}
                style={{ cursor: 'pointer' }}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
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

        <div
          className={styles.videosGrid}
          style={processedVideos.length === 0 ? {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            width: '100%',
          } : {}}
        >
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
            videos.length === 0 ? (
              <div
                className={styles.emptyState + ' enhanced-empty-state'}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60vh',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                <div
                  className={styles.emptyIcon + ' enhanced-empty-emoji'}
                  style={{ fontSize: '96px', marginBottom: '32px', opacity: 0.9, textAlign: 'center' }}
                >
                  🎬
                </div>
                <h2
                  className="enhanced-empty-title"
                  style={{ fontSize: '2.75rem', fontWeight: 800, color: '#fff', marginBottom: '18px', letterSpacing: '0.5px', textAlign: 'center' }}
                >
                  No videos found
                </h2>
                <p
                  className="enhanced-empty-desc"
                  style={{ fontSize: '1.5rem', color: '#b3b3b3', marginBottom: 0, fontWeight: 500, textAlign: 'center' }}
                >
                  Start by creating a new video.
                </p>
              </div>
            ) : (
              <div
                className={styles.emptyState + ' enhanced-empty-state'}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '30vh',
                  width: '100%',
                  textAlign: 'center',
                }}
              >
                <h2
                  className="enhanced-empty-title"
                  style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '10px', letterSpacing: '0.5px', textAlign: 'center' }}
                >
                  No videos match this filter.
                </h2>
              </div>
            )
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
      {showOnboarding && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: 420 }}>
            <h2 className={styles.modalTitle}>Complete your profile</h2>
            <p className={styles.modalText}>Please complete your profile to continue using the platform.</p>
            <form onSubmit={handleOnboardingSubmit} className="space-y-4">
              <div>
                <label className="block text-base font-medium text-white/70 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] text-white/90 focus:outline-none focus:border-[#0ea5e9] transition-colors"
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-white/70 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] text-white/90 focus:outline-none focus:border-[#0ea5e9] transition-colors"
                  placeholder="Enter your last name"
                />
              </div>
              <div>
                <label className="block text-base font-medium text-white/70 mb-1">Profession</label>
                <input
                  type="text"
                  value={profession}
                  onChange={e => setProfession(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] text-white/90 focus:outline-none focus:border-[#0ea5e9] transition-colors"
                  placeholder="Enter your profession"
                />
              </div>
              {onboardingError && <div className="text-red-400 text-center text-sm">{onboardingError}</div>}
              {onboardingSuccess && <div className="text-green-400 text-center text-sm">{onboardingSuccess}</div>}
              <button
                type="submit"
                className="w-full py-3 px-6 mt-2 bg-gradient-to-br from-[#0ea5e9] to-[#7c3aed] text-white rounded-lg shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:translate-y-[-2px] hover:shadow-[0_8px_25px_rgba(14,165,233,0.4)] transition-all duration-300 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                disabled={onboardingLoading}
              >
                {onboardingLoading ? 'Saving...' : 'Complete profile'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 