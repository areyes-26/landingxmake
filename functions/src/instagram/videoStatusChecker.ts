import * as functions from 'firebase-functions/v1'; // 👈 Import correcto v1
import * as admin from 'firebase-admin';
import { metaGraphApiClient } from './metaGraphApiClient';
import { COLLECTIONS, VideoPublishStatus } from './types';
import type { DocumentSnapshot } from 'firebase-functions/v1/firestore';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const CHECK_INTERVAL_MS = 30_000;
const MAX_RETRIES = 10;

export const checkVideoStatus = functions.firestore
  .document(`${COLLECTIONS.VIDEO_PUBLISH}/{statusId}`)
  .onCreate(async (snapshot: DocumentSnapshot, context: any) => {
    const initial = snapshot.data() as VideoPublishStatus;
    const { userId, creationId } = initial;
    if (!userId || !creationId) return null;

    let retries = 0;

    const pollStatus = async (): Promise<void> => {
      try {
        const resp = await metaGraphApiClient.checkVideoStatus(userId, creationId);
        if (resp.error) throw new Error(resp.error.message);

        const videoStatus = resp.data!;

        const updates: Partial<VideoPublishStatus> = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastCheckAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (videoStatus.status === 'FINISHED') {
          try {
            await metaGraphApiClient.publishVideo(userId, creationId);
            await snapshot.ref.update({
              ...updates,
              status: 'PUBLISHED',
              mediaUrl: videoStatus.media_url,
            });
          } catch (err) {
            await snapshot.ref.update({
              ...updates,
              status: 'FAILED',
              error: err instanceof Error ? err.message : 'Error al publicar video',
            });
          }
          return;
        }

        if (videoStatus.status === 'ERROR') {
          await snapshot.ref.update({
            ...updates,
            status: 'FAILED',
            error: videoStatus.error?.message,
          });
          return;
        }

        await snapshot.ref.update({
          ...updates,
          status: 'PENDING',
        });

        retries++;
        if (retries < MAX_RETRIES) {
          await new Promise(res => setTimeout(res, CHECK_INTERVAL_MS));
          return pollStatus();
        } else {
          await snapshot.ref.update({
            status: 'FAILED',
            error: 'Max retries exceeded',
          });
        }
      } catch (err) {
        console.error('Error checking video status:', err);
        await snapshot.ref.update({
          status: 'FAILED',
          error: err instanceof Error ? err.message : 'Error checking status',
        });
      }
    };

    return pollStatus();
  });
