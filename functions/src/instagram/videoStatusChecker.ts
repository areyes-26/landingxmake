import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { metaGraphApiClient } from './metaGraphApiClient';
import { COLLECTIONS, VideoPublishStatus } from './types';

admin.initializeApp();

const CHECK_INTERVAL = 30000; // 30 seconds
const MAX_RETRIES = 10;
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

interface StatusCheckResult {
  status: VideoPublishStatus['status'];
  error?: string;
  mediaUrl?: string;
}

export const checkVideoStatus = onDocumentCreated(
  `/${COLLECTIONS.VIDEO_PUBLISH}/{statusId}`,
  async (event) => {
    const statusDoc = event.data;
    if (!statusDoc || !statusDoc.exists) return;

    const status = statusDoc.data() as VideoPublishStatus;
    if (!status.creationId) return;

    let retries = 0;
    let currentStatus = status.status;

    const checkStatus = async () => {
      try {
        const statusResponse = await metaGraphApiClient.checkVideoStatus(
          status.userId,
          status.creationId
        );

        if (statusResponse.error) {
          throw new Error(statusResponse.error.message);
        }

        const videoStatus = statusResponse.data;
        if (!videoStatus) {
          throw new Error('No status data returned');
        }

        const statusUpdate = {
          status: videoStatus.status as VideoPublishStatus['status'],
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastCheckAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (videoStatus.status === 'FINISHED') {
          // Video is ready, publish it
          try {
            await metaGraphApiClient.publishVideo(status.userId, status.creationId);
            await statusDoc.ref.update({
              ...statusUpdate,
              status: 'PUBLISHED' as const,
              mediaUrl: videoStatus.media_url
            });
          } catch (error) {
            console.error('Error publishing video:', error);
            await statusDoc.ref.update({
              ...statusUpdate,
              status: 'FAILED' as const,
              error: error instanceof Error ? error.message : 'Failed to publish video'
            });
          }
        } else if (videoStatus.status === 'ERROR') {
          await statusDoc.ref.update({
            ...statusUpdate,
            status: 'FAILED' as const,
            error: videoStatus.error?.message
          });
        } else {
          // Still uploading, update status and schedule next check
          await statusDoc.ref.update(statusUpdate);
          retries++;
          if (retries < MAX_RETRIES) {
            setTimeout(checkStatus, CHECK_INTERVAL);
          } else {
            await statusDoc.ref.update({
              status: 'FAILED' as const,
              error: 'Max retries exceeded'
            });
          }
        }
      } catch (error) {
        console.error('Error checking video status:', error);
        await statusDoc.ref.update({
          status: 'FAILED' as const,
          error: error instanceof Error ? error.message : 'Failed to check status'
        });
      }
    };

    await checkStatus();
  }
);
