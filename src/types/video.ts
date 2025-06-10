import { Timestamp } from 'firebase/firestore';

export interface VideoData {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  videoUrl?: string;
  thumbnailUrl?: string;
  script?: string;
  videoTitle: string;
  description: string;
  topic: string;
  avatarId: string;
  callToAction: string;
  specificCallToAction: string;
  tone: string;
  email: string;
  duration: string;
  socialContent?: {
    socialCopies: {
      platform: string;
      content: string;
    }[];
  };
  shortCopy?: {
    platform: string;
    content: string;
  };
  longCopy?: {
    platform: string;
    content: string;
  };
} 