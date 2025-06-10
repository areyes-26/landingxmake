export interface VideoData {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
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

export interface ScriptResponse {
  script: string;
  error?: string;
}

export interface SocialContentResponse {
  socialCopies: {
    platform: string;
    content: string;
  }[];
}

export interface SocialCopyResponse {
  socialCopy: string;
}

export interface ShortCopyResponse {
  shortCopy: {
    platform: string;
    content: string;
  };
  error?: string;
}

export interface LongCopyResponse {
  longCopy: {
    platform: string;
    content: string;
  };
  error?: string;
}

export interface ApiError {
  error: string;
  status: number;
} 