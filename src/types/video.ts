import { Timestamp } from 'firebase/firestore';

export interface VideoData {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'draft' | 'editing';
  error?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  currentStep?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  script?: string;
  videoTitle: string;
  description: string;
  topic: string;
  avatarId: string;
  lookId?: string;
  callToAction: string;
  specificCallToAction: string;
  tone: string;
  email: string;
  duration: string;
  voiceId: string;
  voiceDetails?: {
    name: string;
    language: string;
    gender: string;
    preview_url?: string;
  };
  socialContent?: {
    socialCopies: {
      platform: string;
      content: string;
    }[];
  };
  shortCopy?: string;
  longCopy?: string;
  
  // OpenAI Results
  openAIResults?: {
    script?: {
      content: string;
      generatedAt: Timestamp;
    };
    socialContent?: {
      socialCopies: {
        platform: string;
        content: string;
      }[];
      generatedAt: Timestamp;
    };
  };

  // External Service Results
  heygenResults?: {
    videoUrl?: string;
    status?: string;
    generatedAt?: Timestamp;
    taskId?: string;
    videoId?: string;
    error?: string;
  };

  creatomateResults?: {
    videoUrl?: string;
    status?: string;
    generatedAt?: Timestamp;
    renderId?: string;
    error?: string;
    outputFormat?: string;
    renderScale?: number;
    width?: number;
    height?: number;
    frameRate?: string;
    duration?: number;
    fileSize?: number;
    modifications?: any;
  };
} 