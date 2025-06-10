import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as instagram from './instagram/callback';
import * as crypto from 'crypto'; // Para verificar la firma de Meta
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

// Export functions and admin instances for other modules
export { functions, admin };


// Tu Facebook App Secret 
const FB_APP_SECRET = functions.config.facebook?.app_secret;
// Replace these lines with your actual configuration paths
const HEYGEN_API_KEY = functions.config.heygen.api_key;
const INSTAGRAM_CLIENT_SECRET = functions.config.instagram.client_secret;
const GOOGLE_SCRIPT_URL = functions.config.google.script_url;

export const facebookWebhook = functions.https.onRequest(async (req, res) => {
    // --- Paso 1: Verificación del Webhook (Solo para la configuración inicial en Meta) ---
    // Meta envía una solicitud GET a tu URL de webhook para verificarla.
    if (req.method === 'GET') {
        const VERIFY_TOKEN = 'mi_token_secreto_para_meta'; // Un token secreto que tú inventas y guardas
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === VERIFY_TOKEN) {
                console.log('Webhook verificado y suscrito!');
                res.status(200).send(challenge);
                return;
            } else {
                console.error('Fallo en la verificación del Webhook.');
                res.status(403).send('Verification token mismatch');
                return;
            }
        } else {
            console.error('Faltan parámetros en la verificación del Webhook.');
            res.status(400).send('Missing query parameters');
            return;
        }
    }

    // --- Paso 2: Manejo de Eventos del Webhook (Una vez que está verificado) ---
    // Meta enviará solicitudes POST para notificarte sobre eventos.
    if (req.method === 'POST') {
        // Opcional pero ALTAMENTE RECOMENDADO: Verificar la firma de la solicitud
        // para asegurarse de que proviene de Meta y no es un ataque.
        const signature = Array.isArray(req.headers['x-hub-signature-256']) 
            ? req.headers['x-hub-signature-256'][0] 
            : req.headers['x-hub-signature-256'];
        
        if (!signature || !FB_APP_SECRET) {
            console.warn('Falta firma o App Secret para verificar el webhook.');
            // Aún así procesa si estás en desarrollo, pero es un riesgo en producción
        } else {
            const elements = signature?.split('=');
            if (!elements || elements.length !== 2) {
                console.error('Invalid signature format');
                res.status(403).send('Invalid signature format');
                return;
            }
            const signatureHash = elements[1];
            const expectedHash = crypto.createHmac('sha256', FB_APP_SECRET)
                                     .update(req.rawBody) // Necesitas `req.rawBody` para verificar.
                                     .digest('hex');

            if (signatureHash !== expectedHash) {
                console.error('Firma de Webhook inválida. Posible ataque.');
                res.status(403).send('Invalid signature');
                return;
            }
        }

        // Aquí procesas los datos que Meta te envía.
        // La carga útil del webhook variará según el evento suscrito.
        const data = req.body;
        console.log('Webhook recibido:', JSON.stringify(data, null, 2));

        // Ejemplo: Procesar cambios de publicaciones de Instagram
        if (data.object === 'instagram' && data.entry) {
            data.entry.forEach((entry: any) => {
                entry.changes.forEach((change: any) => {
                    if (change.field === 'media') {
                        // Aquí puedes reaccionar a cambios en el estado de un video/publicación
                        // Por ejemplo, si un video terminó de procesarse.
                        console.log('Cambio en media de Instagram:', change.value);
                        // Puedes guardar esto en Firestore, enviar una notificación, etc.
                    }
                });
            });
        }

        // SIEMPRE responde con 200 OK para que Meta sepa que recibiste el evento.
        res.status(200).send('EVENT_RECEIVED');
        return;
    }

    // Si no es GET ni POST, es una solicitud inesperada.
    res.status(405).send('Method Not Allowed');
    return;
});

export const instagramCallback = instagram.instagramCallback;

// Inicializar Firebase Admin
admin.initializeApp();

// Función que se dispara cuando se crea un nuevo documento en la colección 'videos'
export const onVideoCreated = onDocumentCreated('videos/{videoId}', async (event) => {
  try {
    const videoData = event.data?.data();
    if (!videoData) {
      console.error('No data in document');
      return;
    }

    // Actualizar el estado a 'processing'
    await event.data?.ref.update({
      status: 'processing',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Preparar los datos para OpenAI
    const openAIData = {
      titulo: videoData.videoTitle,
      descripcion: videoData.description,
      tono: videoData.tone,
      duration: videoData.duration,
      tema: videoData.topic,
      keyPoints: videoData.specificCallToAction ? [videoData.specificCallToAction] : undefined,
      targetAudience: videoData.email
    };

    // Generar el script usando OpenAI
    const scriptResponse = await fetch(`${process.env.API_URL}/api/openai/generate-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        videoData: openAIData,
        generationId: event.data?.id
      })
    });

    if (!scriptResponse.ok) {
      throw new Error('Failed to generate script');
    }

    const scriptResult = await scriptResponse.json();

    // Actualizar el documento con el script generado
    await event.data?.ref.update({
      status: 'completed',
      script: scriptResult.script,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

  } catch (error) {
    console.error('Error processing video:', error);
    // Actualizar el estado a 'failed' en caso de error
    await event.data?.ref.update({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
});
