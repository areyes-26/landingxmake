// functions/src/instagram/publish.ts

import * as functions from 'firebase-functions/v1';
import { admin, db } from '../lib/firebase-admin';
import corsModule from 'cors';
import { metaGraphApiClient } from './metaGraphApiClient';
import { COLLECTIONS, VideoPublishStatus } from './types';

// Configura CORS
const cors = corsModule({ origin: true });

// Endpoint: publicar video en Instagram
export const publishToInstagram = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 300, maxInstances: 1 })
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      try {
        const { userId, videoUrl, caption } = req.body as {
          userId?: string;
          videoUrl?: string;
          caption?: string;
        };

        if (!userId || !videoUrl) {
          res.status(400).json({ error: 'userId and videoUrl are required' });
          return;
        }

        // 1) Crear contenedor de video en Meta
        const containerResponse = await metaGraphApiClient.createVideoContainer(
          userId,
          videoUrl,
          caption
        );
        if (containerResponse.error) {
          throw new Error(containerResponse.error.message);
        }
        const creationId = containerResponse.data!.id;
        if (!creationId) {
          throw new Error('Failed to create video container');
        }

        // 2) Guardar estado inicial en Firestore
        const statusRef = await db
          .collection(COLLECTIONS.VIDEO_PUBLISH)
          .add({
            userId,
            creationId,
            videoUrl,
            caption,
            status: 'CREATING' as const,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastCheckAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        // 3) Responder inmediatamente con el ID de estado
        res.status(200).json({
          statusId: statusRef.id,
          creationId,
          status: 'CREATING',
        });
      } catch (error) {
        console.error('Error creating video container:', error);
        res
          .status(500)
          .json({ error: error instanceof Error ? error.message : 'Internal server error' });
      }
    });
  });

// Endpoint: consultar estado de publicación
export const getVideoPublishStatus = functions
  .region('us-central1')
  .runWith({ timeoutSeconds: 300, maxInstances: 1 })
  .https.onRequest((req, res) => {
    cors(req, res, async () => {
      try {
        const { statusId } = req.body as { statusId?: string };
        if (!statusId) {
          res.status(400).json({ error: 'statusId is required' });
          return;
        }

        const snap = await db.collection(COLLECTIONS.VIDEO_PUBLISH).doc(statusId).get();
        if (!snap.exists) {
          res.status(404).json({ error: 'Status not found' });
          return;
        }

        const status = snap.data() as VideoPublishStatus;
        res.status(200).json(status);
      } catch (error) {
        console.error('Error getting video publish status:', error);
        res
          .status(500)
          .json({ error: error instanceof Error ? error.message : 'Internal server error' });
      }
    });
  });
