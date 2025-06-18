import axios from 'axios';
import * as functions from 'firebase-functions';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || functions.config().heygen?.api_key;
const HEYGEN_API_URL = 'https://api.heygen.com';

export interface VideoStatusResponse {
  status: string;
  videoUrl?: string;
  error?: string;
  thumbnailUrl?: string;
  gifUrl?: string;
  duration?: string;
  captionUrl?: string;
}

export class HeyGenAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = HEYGEN_API_KEY || '';
    this.baseUrl = HEYGEN_API_URL;
  }

  async checkVideoStatus(videoId: string): Promise<VideoStatusResponse> {
    try {
      const response = await axios.get(`${this.baseUrl}/v1/video_status.get?video_id=${videoId}`, {
        headers: {
          'X-Api-Key': this.apiKey,
        },
      });
      const data = response.data;
      if (!data || !data.data) {
        throw new Error('Invalid response format from HeyGen API');
      }
      return {
        status: data.data.status || 'unknown',
        videoUrl: data.data.video_url,
        error: data.data.error,
        thumbnailUrl: data.data.thumbnail_url,
        gifUrl: data.data.gif_url,
        duration: data.data.duration,
        captionUrl: data.data.caption_url,
      };
    } catch (error) {
      console.error('Error checking video status:', error);
      throw error;
    }
  }
} 