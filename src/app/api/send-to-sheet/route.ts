// src/app/api/send-to-sheet/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { dbInstance } from '@/firebase/client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    // 1) Leemos el JSON que envía el cliente
    const body = await req.json();
    console.log("📦 Body recibido:", body);

    // 2) Desestructuramos exactamente las propiedades que esperamos
    const {
      videoTitle,
      description,
      topic,
      avatarId,
      callToAction,
      tone,
      email,
      requestDate,
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
      const videoDoc = await addDoc(collection(dbInstance, 'videos'), {
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

    // 5) URL de tu Apps Script
    const googleScriptUrl =
      'https://script.google.com/macros/s/AKfycbydTxZSMPhxChk5DHF-_YWT7sBHSXsIqovLy-8JVPuA9c2EJIYdif80S0JvICiBCPfO/exec';
    console.log("🔗 Using Google Script URL:", googleScriptUrl);

    // 6) Construimos el payload para Google Sheets
    const payload = {
      requestDate: new Date().toISOString(),
      videoTitle,
      description,
      topic,
      avatarId,
      id: '',
      userEmail: email || '',
      tone: tone || '',
      videoCategory: '',
      nombreEmpresa: '',
      callToAction: callToAction || '',
      specificCallToAction: specificCallToAction || '',
      duration: duration || '',
    };

    console.log("📦 Data to send to Google Sheets:", payload);

    // 7) Hacemos POST al endpoint de Google Apps Script
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // 8) Leemos la respuesta
    const text = await response.text();
    console.log("📥 RESPONSE FROM GOOGLE SHEETS:", text);

    // 9) Intentamos parsear la respuesta como JSON
    try {
      const json = JSON.parse(text);
      return NextResponse.json({
        success: true,
        message: "Datos guardados correctamente",
        firestoreId: firestoreDocId,
        ...json
      }, { status: 200 });
    } catch (parseError) {
      console.error("⚠️ ERROR PARSING RESPONSE:", parseError);
      return NextResponse.json({ 
        success: true,
        message: "Datos guardados correctamente",
        firestoreId: firestoreDocId,
        rawResponse: text
      }, { status: 200 });
    }

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
