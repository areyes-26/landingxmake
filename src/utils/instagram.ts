import { db } from '../firebase/client';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { InstagramAuthResponse, InstagramMediaResponse, InstagramMediaPublishResponse } from '../types/instagram';
import { auth } from '../firebase/client';

interface InstagramProfile {
  id: string;
  username: string;
  profile_picture: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: number;
}

interface StoredInstagramProfile extends InstagramProfile {
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const INSTAGRAM_COLLECTION = 'instagram_profiles';

export async function getInstagramProfile(userId: string): Promise<InstagramProfile | null> {
  try {
    const profileRef = doc(db, INSTAGRAM_COLLECTION, userId);
    const profileDoc = await getDoc(profileRef);
    
    if (!profileDoc.exists()) {
      return null;
    }
    
    const profile = profileDoc.data() as StoredInstagramProfile;
    return {
      id: profile.id,
      username: profile.username,
      profile_picture: profile.profile_picture,
      access_token: profile.access_token,
      refresh_token: profile.refresh_token,
      token_expires_at: profile.token_expires_at
    };
  } catch (error) {
    console.error('Error fetching Instagram profile:', error);
    throw error;
  }
}

export async function updateInstagramProfile(userId: string, updates: Partial<InstagramProfile>) {
  try {
    const profileRef = doc(db, INSTAGRAM_COLLECTION, userId);
    await updateDoc(profileRef, {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating Instagram profile:', error);
    throw error;
  }
}

export async function uploadVideoToInstagram(
  videoUrl: string,
  caption: string,
  userId: string
): Promise<boolean> {
  try {
    // Get user's Instagram profile
    const docRef = doc(db, INSTAGRAM_COLLECTION, userId);
    const profileDoc = await getDoc(docRef);
    
    if (!profileDoc.exists()) {
      throw new Error('Instagram profile not found');
    }

    const profile = profileDoc.data() as InstagramProfile;

    // Prepare the video upload request
    const formData = new FormData();
    formData.append('access_token', profile.access_token);
    formData.append('caption', caption);
    formData.append('media_type', 'VIDEO');
    formData.append('video_url', videoUrl);

    // Upload to Instagram
    const response = await fetch(`https://graph.facebook.com/${profile.id}/media`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to upload video to Instagram: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json() as InstagramMediaResponse;
    
    // Publish the video
    const publishResponse = await fetch(`https://graph.facebook.com/${profile.id}/media_publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        creation_id: data.id,
        access_token: profile.access_token
      })
    });

    if (!publishResponse.ok) {
      const errorData = await publishResponse.json();
      throw new Error(`Failed to publish video to Instagram: ${errorData.error?.message || 'Unknown error'}`);
    }

    return true;
  } catch (error) {
    console.error('Instagram video upload error:', error);
    throw error;
  }
}

export async function signOutInstagram() {
  try {
    await auth.signOut();
    return true;
  } catch (error) {
    console.error('Error signing out:', error);
    return false;
  }
}
