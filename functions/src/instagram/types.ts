// functions/src/instagram/types.ts

export interface InstagramAuthResponse {
  access_token: string;
  user_id: string;
}

export interface InstagramToken {
  id: string;
  userId: string;
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
  createdAt: Date;
  lastUsedAt: Date;
  status: 'active' | 'expired' | 'inactive' | 'revoked';
  scopes: string[];
  pageAccessToken?: string;
  instagramBusinessAccount?: {
    id: string;
    username: string;
    name: string;
    profile_picture_url?: string;
  };
  firebaseUid?: string;
  userEmail?: string;
  pageId?: string;
}

export interface InstagramMedia {
  id: string;
  userId: string;
  mediaId: string;
  mediaType: string;
  mediaUrl: string;
  thumbnailUrl: string;
  caption: string;
  username: string;
  timestamp: Date;
  status: 'pending' | 'published' | 'failed' | 'archived';
  error?: string;
  likes?: number;
  comments?: number;
  views?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublishVideoRequest {
  userId: string;
  videoUrl: string;
  caption?: string;
}

export interface VideoPublishStatus {
  id: string;
  userId: string;
  creationId: string;
  videoUrl: string;
  caption?: string;
  status: 'CREATING' | 'UPLOADING' | 'PENDING' | 'PUBLISHED' | 'FAILED';
  error?: string;
  createdAt: Date;
  updatedAt: FirebaseFirestore.FieldValue | Date;
  lastCheckAt: FirebaseFirestore.FieldValue | Date;
  mediaUrl?: string;
}

export interface InstagramProfile {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  profilePictureUrl: string;
  bio: string;
  website?: string;
  followersCount: number;
  followingCount: number;
  mediaCount: number;
  isPrivate: boolean;
  isVerified: boolean;
  businessDiscovery?: {
    id: string;
    username: string;
    profileType: string;
    mediaCount: number;
    followersCount: number;
  };
  lastUpdated: Date;
}

export const COLLECTIONS = {
  TOKENS: 'app_tokens',
  MEDIA: 'instagram_media',
  VIDEO_PUBLISH: 'instagram_video_publish',
  WEBHOOK_EVENTS: 'instagram_webhook_events',
} as const;

export const INDEXES = {
  MEDIA_BY_USER: ['userId', 'createdAt'],
} as const;

export const RETENTION = {
  MEDIA: 365,
} as const;
