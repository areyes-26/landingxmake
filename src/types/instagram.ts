export interface InstagramAuthResponse {
  access_token: string;
  user_id: string;
  user: {
    id: string;
    username: string;
    profile_picture_url: string;
  };
}

export interface InstagramMediaResponse {
  id: string;
  media_type: 'VIDEO' | 'IMAGE';
  media_url: string;
  status: 'FINISHED' | 'ERROR' | 'IN_PROGRESS';
  timestamp: string;
}

export interface InstagramMediaPublishResponse {
  id: string;
  status: 'FINISHED' | 'ERROR' | 'IN_PROGRESS';
  timestamp: string;
}
