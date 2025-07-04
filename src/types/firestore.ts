import { Timestamp } from 'firebase/firestore';

export interface VideoGeneration {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'draft' | 'editing';
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
  };

  creatomateResults?: {
    videoUrl?: string;
    status?: string;
    generatedAt?: Timestamp;
    renderId?: string;
    error?: string;
  };
} 