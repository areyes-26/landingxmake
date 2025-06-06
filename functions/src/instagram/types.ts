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
}

export interface PublishVideoRequest {
  userId: string;
  videoUrl: string;
  caption?: string;
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

export interface VideoPublishStatus {
  id: string;
  userId: string;
  creationId: string;
  videoUrl: string;
  caption?: string;
  status: 'CREATING' | 'UPLOADING' | 'PENDING' | 'PUBLISHED' | 'FAILED';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  lastCheckAt: Date;
  mediaUrl?: string;
}

export const COLLECTIONS = {
  MEDIA: 'instagram_media',
  VIDEO_PUBLISH: 'instagram_video_publish',
  WEBHOOK_EVENTS: 'instagram_webhook_events',
  TOKENS: 'instagram_tokens'
} as const;

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

export interface InstagramComment {
  id: string;
  mediaId: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
  likes?: number;
  parentId?: string;
  status: 'active' | 'deleted' | 'hidden';
  createdAt: Date;
  updatedAt: Date;
}

export interface InstagramStory {
  id: string;
  userId: string;
  mediaId: string;
  mediaType: string;
  mediaUrl: string;
  caption: string;
  timestamp: Date;
  views: number;
  expiresAt: Date;
  status: 'active' | 'expired';
  createdAt: Date;
}

export interface InstagramInsights {
  id: string;
  userId: string;
  mediaId?: string;
  type: 'impressions' | 'reach' | 'engagement' | 'profile_views';
  period: 'day' | 'week' | 'lifetime';
  value: number;
  timestamp: Date;
  createdAt: Date;
}

// Firestore collection paths
export const COLLECTIONS = {
  TOKENS: 'instagram_tokens',
  MEDIA: 'instagram_media',
  PROFILES: 'instagram_profiles',
  COMMENTS: 'instagram_comments',
  STORIES: 'instagram_stories',
  INSIGHTS: 'instagram_insights'
} as const;

// Firestore indexes
export const INDEXES = {
  MEDIA_BY_USER: ['userId', 'createdAt'],
  COMMENTS_BY_MEDIA: ['mediaId', 'createdAt'],
  STORIES_BY_USER: ['userId', 'expiresAt'],
  INSIGHTS_BY_PERIOD: ['type', 'period', 'timestamp']
} as const;

// Firestore retention policies (in days)
export const RETENTION = {
  MEDIA: 365,
  COMMENTS: 180,
  STORIES: 7,
  INSIGHTS: 30
} as const;
