import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    // 1) Leemos el JSON que envía el cliente
    const body = await req.json();
    console.log("📦 Body recibido:", body);

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
    } = body;

    // 3) Validación básica
    if (!videoTitle || !description || !topic || !avatarId) {
      return NextResponse.json(
        {
          error: 'Faltan campos requeridos: videoTitle, description, topic o avatarId.',
        },
        { status: 400 }
      );
    }

    let firestoreDocId = null;

    // 4) Guardar en Firestore
    try {
      console.log("💾 Guardando en Firestore...");
      const videoDoc = await addDoc(collection(db, 'videos'), {
        videoTitle,
        description,
        topic,
        avatarId,
        callToAction,
        specificCallToAction,
        tone,
        email,
        duration,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      firestoreDocId = videoDoc.id;
      console.log("✅ Documento creado en Firestore con ID:", firestoreDocId);
    } catch (firestoreError) {
      console.error("❌ Error al guardar en Firestore:", firestoreError);
      return NextResponse.json(
        {
          error: "Error al guardar en Firestore",
          details: firestoreError instanceof Error ? firestoreError.message : String(firestoreError)
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
    const videoData = {
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
        videoData,
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
    console.error("❌ Error general:", error);
    return NextResponse.json(
      { 
        error: "Error procesando la solicitud",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 