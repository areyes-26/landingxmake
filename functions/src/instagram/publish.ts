import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { metaGraphApiClient } from './metaGraphApiClient';
import { COLLECTIONS, VideoPublishStatus } from './types';

admin.initializeApp();

interface PublishVideoRequest {
  userId: string;
  videoUrl: string;
  caption?: string;
}

export const publishToInstagram = onRequest({
  cors: true,
  region: 'us-central1',
  maxInstances: 1,
  timeoutSeconds: 300,
}, async (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      throw new Error('No request body received');
    }

    // Validate request
    if (!data.userId || !data.videoUrl) {
      res.status(400).json({
        error: 'userId and videoUrl are required'
      });
      return;
    }

    // Create video container
    try {
      const containerResponse = await metaGraphApiClient.createVideoContainer(
        data.userId,
        data.videoUrl,
        data.caption
      );

      if (containerResponse.error) {
        throw new Error(containerResponse.error.message);
      }

      const creationId = containerResponse.data?.id;
      if (!creationId) {
        throw new Error('Failed to create video container');
      }

      // Save to Firestore
      const statusRef = await admin.firestore().collection(COLLECTIONS.VIDEO_PUBLISH).add({
        userId: data.userId,
        creationId,
        videoUrl: data.videoUrl,
        caption: data.caption,
        status: 'CREATING' as const,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastCheckAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Return immediately with status ID
      res.status(200).json({
        statusId: statusRef.id,
        creationId,
        status: 'CREATING'
      });
      return;
    } catch (error) {
      console.error('Error creating video container:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create video container'
      });
      return;
    }
  } catch (error) {
    console.error('Error in publishToInstagram:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Get video publishing status
export const getVideoPublishStatus = onRequest({
  cors: true,
  region: 'us-central1',
  maxInstances: 1,
  timeoutSeconds: 300,
}, async (req, res) => {
  try {
    const { statusId } = req.body;
    if (!statusId) {
      res.status(400).json({
        error: 'statusId is required'
      });
      return;
    }

    const statusDoc = await admin.firestore().collection(COLLECTIONS.VIDEO_PUBLISH)
      .doc(statusId)
      .get();

    if (!statusDoc.exists) {
      res.status(404).json({
        error: 'Status not found'
      });
      return;
    }

    const status = statusDoc.data() as VideoPublishStatus;
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting video publish status:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get status'
    });
  }
});
