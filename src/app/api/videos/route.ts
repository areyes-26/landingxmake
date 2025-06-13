import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  console.log('db en /api/videos:', db);
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

  try {
    // 1) Leemos el JSON que envía el cliente
    const body = await req.json();
    console.log("📦 Body recibido:", JSON.stringify(body, null, 2));

    // 2) Desestructuramos las propiedades que esperamos
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

    // 3) Validación básica
    if (!videoTitle || !description || !topic || !avatarId || !voiceId) {
      console.log("❌ Validación fallida:", {
        videoTitle: !!videoTitle,
        description: !!description,
        topic: !!topic,
        avatarId: !!avatarId,
        voiceId: !!voiceId
      });
      return NextResponse.json(
        {
          error: 'Faltan campos requeridos: videoTitle, description, topic, avatarId o voiceId.',
        },
        { status: 400 }
      );
    }

    let firestoreDocId = null;

    // 4) Guardar en Firestore
    try {
      console.log("💾 Preparando datos para Firestore...");
      const videoData = {
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
        voiceDetails,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      };
      console.log("📝 Datos a guardar:", JSON.stringify(videoData, null, 2));

      console.log("💾 Guardando en Firestore...");
      const videoDocRef = await db.collection('videos').add(videoData);
firestoreDocId = videoDocRef.id;
      console.log("✅ Documento creado en Firestore con ID:", firestoreDocId);
    } catch (firestoreError) {
      console.error("❌ Error detallado al guardar en Firestore:", {
        error: firestoreError,
        message: firestoreError instanceof Error ? firestoreError.message : String(firestoreError),
        stack: firestoreError instanceof Error ? firestoreError.stack : undefined,
        code: firestoreError instanceof Error ? (firestoreError as any).code : undefined
      });
      
      // Manejo específico de errores comunes de Firestore
      const errorMessage = firestoreError instanceof Error ? firestoreError.message : String(firestoreError);
      const errorCode = firestoreError instanceof Error ? (firestoreError as any).code : undefined;
      
      if (errorCode === 'permission-denied') {
        return NextResponse.json(
          {
            error: "Error de permisos al guardar en Firestore",
            details: "No tienes permisos para escribir en la colección 'videos'"
          },
          { status: 403 }
        );
      }
      
      if (errorCode === 'unavailable') {
        return NextResponse.json(
          {
            error: "Error de conexión con Firestore",
            details: "El servicio de Firestore no está disponible en este momento"
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

    // 5) Enviar a Google Sheets
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

      const sheetsText = await sheetsResponse.text();
      console.log("📥 Respuesta de Google Sheets:", sheetsText);

      // Intentar parsear la respuesta como JSON
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

    // 6) Preparar datos para OpenAI
    const videoDataForOpenAI = {
      videoTitle,
      description,
      tone,
      duration,
      topic,
      keyPoints: specificCallToAction ? [specificCallToAction] : undefined,
      targetAudience: email
    };

    // 7) Llamar al endpoint de generación de script
    const host = req.headers.get('host');
    const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
    const scriptResponse = await fetch(`${protocol}://${host}/api/openai/generate-script`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        videoData: videoDataForOpenAI,
        generationId: firestoreDocId
      })
    });

    if (!scriptResponse.ok) {
      console.error("❌ Error al generar script:", await scriptResponse.text());
      // Aún así devolvemos éxito porque el documento se creó en Firestore
      return NextResponse.json({
        success: true,
        message: "Documento creado en Firestore, pero hubo un error al generar el script",
        firestoreId: firestoreDocId
      }, { status: 200 });
    }

    const scriptResult = await scriptResponse.json();

    return NextResponse.json({
      success: true,
      message: "Documento creado y script generado correctamente",
      firestoreId: firestoreDocId,
      script: scriptResult.script
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Error general:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 