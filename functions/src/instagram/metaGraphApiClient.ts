import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { TokenManager } from './tokenManager';
import { InstagramToken } from './types';

const tokenManager = new TokenManager();
const GRAPH_API_VERSION = 'v18.0';
const GRAPH_API_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaApiError {
  readonly code: number;
  readonly message: string;
  readonly type?: string;
  readonly error_subcode?: number;
}

export interface VideoStatus {
  status: 'FINISHED' | 'ERROR' | 'IN_PROGRESS';
  media_url?: string;
  error?: {
    code: number;
    message: string;
  };
}

export interface MetaApiResponse<T> {
  readonly data?: T;
  readonly error?: MetaApiError;
}

export class MetaApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly subcode?: number,
    public readonly type?: string
  ) {
    super(message);
    this.name = 'MetaApiError';
  }
}

class MetaGraphApiClient {
  private static instance: MetaGraphApiClient;
  private readonly axiosInstance = axios.create({
    baseURL: GRAPH_API_BASE_URL,
    timeout: 30000,
  });

  private constructor() {}

  static getInstance(): MetaGraphApiClient {
    if (!MetaGraphApiClient.instance) {
      MetaGraphApiClient.instance = new MetaGraphApiClient();
    }
    return MetaGraphApiClient.instance;
  }

  private async getAccessToken(userId: string): Promise<string> {
    const token = await tokenManager.getToken(userId);
    if (!token) {
      throw new MetaApiError(
        'No valid token found',
        401,
        undefined,
        undefined
      );
    }
    return token.accessToken;
  }

  private async handleRequest<T>(
    config: AxiosRequestConfig,
    userId: string
  ): Promise<T> {
    let attempts = 0;
    const maxAttempts = 3;
    const initialDelay = 1000;

    while (attempts < maxAttempts) {
      try {
        const accessToken = await this.getAccessToken(userId);
        const response = await this.axiosInstance.request<MetaApiResponse<T>>({
          ...config,
          params: {
            ...config.params,
            access_token: accessToken
          }
        });

        if (response.status >= 400) {
          const errorData = response.data?.error;
          throw new MetaApiError(
            errorData?.message || 'Meta API error',
            errorData?.code || response.status,
            errorData?.subcode,
            errorData?.type
          );
        }

        if (!response.data?.data) {
          throw new MetaApiError(
            'No data in response',
            response.status,
            undefined,
            undefined
          );
        }

        return response.data.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        
        if (axiosError.response?.status === 429) {
          // Rate limit error
          const delay = initialDelay * Math.pow(2, attempts);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempts++;
          continue;
        }

        // Type assertion for the error response
        const errorData = axiosError.response?.data as {
          error?: {
            code?: number;
            message?: string;
            subcode?: number;
            type?: string;
          }
        };

        if (errorData?.error?.code === 190) {
          // Invalid access token
          await tokenManager.refreshToken(userId);
          continue;
        }

        throw new MetaApiError(
          errorData?.error?.message || axiosError.message,
          errorData?.error?.code || axiosError.response?.status || 500,
          errorData?.error?.subcode,
          errorData?.error?.type
        );
      }
    }

    throw new MetaApiError('Max retry attempts exceeded', 500, undefined, undefined);
  }

  async createVideoContainer(
    userId: string,
    videoUrl: string,
    caption?: string
  ): Promise<MetaApiResponse<{ id: string }>> {
    return this.handleRequest(
      {
        method: 'POST',
        url: '/me/media',
        data: {
          media_type: 'VIDEO',
          video_url: videoUrl,
          caption,
          is_carousel_item: false
        }
      },
      userId
    );
  }

  async checkVideoStatus(
    userId: string,
    creationId: string
  ): Promise<MetaApiResponse<{ status: string; media_url?: string; error?: { code: number; message: string } }>> {
    return this.handleRequest(
      {
        method: 'GET',
        url: `/${creationId}`,
        params: {
          fields: 'status,media_url'
        }
      },
      userId
    );
  }

  async publishVideo(
    userId: string,
    creationId: string
  ): Promise<MetaApiResponse<{ id: string }>> {
    return this.handleRequest(
      {
        method: 'POST',
        url: '/me/media_publish',
        data: {
          creation_id: creationId
        }
      },
      userId
    );
  }

  async publishMedia(
    userId: string,
    mediaId: string
  ): Promise<MetaApiResponse<null>> {
    return this.handleRequest(
      {
        method: 'POST',
        url: `/${mediaId}/publish`
      },
      userId
    );
  }

  async getMediaStatus(
    userId: string,
    mediaId: string
  ): Promise<MetaApiResponse<{ status: string }>> {
    return this.handleRequest(
      {
        method: 'GET',
        url: `/${mediaId}`,
        params: { fields: 'status' }
      },
      userId
    );
  }

  async getBusinessAccounts(
    userId: string
  ): Promise<MetaApiResponse<{ data: Array<{ id: string; name: string }> }>> {
    return this.handleRequest(
      {
        method: 'GET',
        url: '/me/accounts',
        params: { fields: 'instagram_business_account' }
      },
      userId
    );
  }
}

export const metaGraphApiClient = MetaGraphApiClient.getInstance();
