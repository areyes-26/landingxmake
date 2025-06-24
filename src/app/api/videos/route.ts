import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';
import { auth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // 1) Verificar que Firestore esté inicializado
    if (!db) {
      console.error("❌ Firestore no está inicializado");
      return NextResponse.json(
        {
          error: "Error de configuración",
          details: "Firestore no está inicializado correctamente"
        },
        { status: 500 }
      );
    }

    // 2) Obtener el token de autenticación
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    let userId;
    try {
      const decodedToken = await auth.verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      console.error("❌ Error al verificar token:", error);
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // 3) Leer y validar el body
    let body;
    try {
      body = await req.json();
      console.log("📦 Body recibido:", JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error("❌ Error al parsear el body:", parseError);
      return NextResponse.json(
        {
          error: "Error al procesar la solicitud",
          details: "El body no es un JSON válido"
        },
        { status: 400 }
      );
    }

    // 4) Desestructurar y validar campos requeridos
    const {
      videoTitle,
      description,
      topic,
      avatarId,
      callToAction,
      tone,
      email,
      specificCallToAction,
      duration,
      voiceId,
      voiceDetails
    } = body;

    // Validación de campos requeridos
    const requiredFields = {
      videoTitle,
      description,
      topic,
      avatarId,
      voiceId
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    // Si faltan campos requeridos, retornar error y NO guardar nada
    if (missingFields.length > 0) {
      return NextResponse.json({
        error: 'Missing required fields',
        missingFields
      }, { status: 400 });
    }

    // 4.1) Leer créditos del usuario y calcular costo
    let userCredits = 0;
    let userPlan = 'free';
    try {
      const userDoc = await db.collection('user_data').doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ error: 'No user data found' }, { status: 403 });
      }
      const userData = userDoc.data()!;
      userCredits = userData.credits || 0;
      userPlan = userData.plan || 'free';
    } catch (err) {
      return NextResponse.json({ error: 'Error reading user credits' }, { status: 500 });
    }

    // Lógica de créditos
    const CREDIT_COSTS = {
      baseVideo: 1,
      durations: {
        '30s': 0,
        '1min': 1,
        '1.5min': 3
      }
    };
    let videoDuration = duration;
    if (videoDuration === '60s') videoDuration = '1min';
    if (videoDuration === '90s') videoDuration = '1.5min';
    const durationCost = CREDIT_COSTS.durations[videoDuration as keyof typeof CREDIT_COSTS.durations] || 0;
    const totalCost = CREDIT_COSTS.baseVideo + durationCost;

    if (userCredits < totalCost) {
      return NextResponse.json({ error: 'Not enough credits', required: totalCost, current: userCredits }, { status: 403 });
    }

    // Descontar créditos antes de crear el video
    try {
      await db.collection('user_data').doc(userId).update({
        credits: userCredits - totalCost
      });
    } catch (err) {
      return NextResponse.json({ error: 'Error updating credits' }, { status: 500 });
    }

    // 5) Guardar en Firestore
    let firestoreDocId;
    try {
      console.log("💾 Preparando datos para Firestore...");
      const videoData: any = {
        videoTitle,
        description,
        topic,
        avatarId,
        callToAction,
        specificCallToAction,
        tone,
        email,
        duration,
        voiceId,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        userId
      };

      if (voiceDetails) {
        videoData.voiceDetails = voiceDetails;
      }

      console.log("💾 Guardando en Firestore con datos:", videoData);
      const videoDocRef = await db.collection('videos').add(videoData);
      firestoreDocId = videoDocRef.id;
      console.log("✅ Documento creado en Firestore con ID:", firestoreDocId);
    } catch (firestoreError) {
      console.error("❌ Error al guardar en Firestore:", {
        error: firestoreError,
        message: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
        code: firestoreError instanceof Error ? (firestoreError as any).code : undefined
      });

      const errorMessage = firestoreError instanceof Error ? firestoreError.message : String(firestoreError);
      const errorCode = firestoreError instanceof Error ? (firestoreError as any).code : undefined;

      if (errorCode === 'permission-denied') {
        return NextResponse.json(
          {
            error: "Error de permisos",
            details: "No tienes permisos para escribir en la colección 'videos'"
          },
          { status: 403 }
        );
      }

      if (errorCode === 'unavailable') {
        return NextResponse.json(
          {
            error: "Error de conexión",
            details: "El servicio de Firestore no está disponible"
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          error: "Error al guardar en Firestore",
          details: errorMessage
        },
        { status: 500 }
      );
    }

    // 6) Enviar a Google Sheets (opcional)
    try {
      const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbydTxZSMPhxChk5DHF-_YWT7sBHSXsIqovLy-8JVPuA9c2EJIYdif80S0JvICiBCPfO/exec';
      console.log("🔗 Enviando a Google Sheets...");

      const payload = {
        requestDate: new Date().toISOString(),
        videoTitle,
        description,
        topic,
        avatarId,
        id: firestoreDocId,
        userEmail: email || '',
        tone: tone || '',
        videoCategory: '',
        nombreEmpresa: '',
        callToAction: callToAction || '',
        specificCallToAction: specificCallToAction || '',
        duration: duration || '',
      };

      const sheetsResponse = await fetch(googleScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!sheetsResponse.ok) {
        throw new Error(`Error en Google Sheets: ${sheetsResponse.status}`);
      }

      const sheetsText = await sheetsResponse.text();
      console.log("📥 Respuesta de Google Sheets:", sheetsText);

      try {
        const sheetsJson = JSON.parse(sheetsText);
        console.log("✅ Datos enviados a Google Sheets:", sheetsJson);
      } catch (parseError) {
        console.warn("⚠️ No se pudo parsear la respuesta de Google Sheets:", parseError);
      }
    } catch (sheetsError) {
      console.error("⚠️ Error al enviar a Google Sheets:", sheetsError);
      // No retornamos error aquí porque el documento ya se creó en Firestore
    }

    // 7) Retornar éxito - la Cloud Function se encargará de generar el script
    console.log("✅ Video creado en Firestore. La Cloud Function generará el script automáticamente.");
    
    return NextResponse.json({
      success: true,
      message: "Video creado exitosamente. El script se generará automáticamente.",
      firestoreId: firestoreDocId
    });

  } catch (error) {
    console.error("❌ Error no manejado:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 