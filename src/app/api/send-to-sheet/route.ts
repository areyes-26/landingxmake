// src/app/api/send-to-sheet/route.ts

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 1) Leemos el JSON que envía el cliente
    const body = await req.json();
    console.log("📦 Body recibido:", body);

    // 2) Desestructuramos exactamente las propiedades que esperamos:
    //    (antes solamente teníamos videoTitle, description, topic, avatarId, callToAction, tone, requestDate,
    //     pero ahora añadimos `email`)
    const {
      videoTitle,
      description,
      topic,
      avatarId,
      callToAction,
      tone,
      email,        // <--- aquí capturamos el campo email
      requestDate,  // (puede venir vacía o undefined; de todos modos la sobreescribimos con la fecha actual)
      specificCallToAction,
      duration,
    } = body;

    // 3) Validación básica: asegurarnos de que los 4 campos principales no estén vacíos
    if (!videoTitle || !description || !topic || !avatarId) {
      return NextResponse.json(
        {
          error: 'Faltan campos requeridos: videoTitle, description, topic o avatarId.',
        },
        { status: 400 }
      );
    }

    // 4) URL de tu Apps Script (puedes poner esto en una variable de entorno si lo prefieres)
    const googleScriptUrl =
      'https://script.google.com/macros/s/AKfycbydTxZSMPhxChk5DHF-_YWT7sBHSXsIqovLy-8JVPuA9c2EJIYdif80S0JvICiBCPfO/exec';
    console.log("🔗 Using Google Script URL:", googleScriptUrl);

    // 5) Construimos el payload EXACTO que tu Apps Script espera
    //    - requestDate: lo forzamos a la fecha actual (`new Date().toISOString()`)
    //    - userEmail: tomamos el `email` que llegó del cliente
    //    - id, videoCategory, nombreEmpresa, specificCallToAction: como en tu script original
    //      no los usas, los dejamos en cadena vacía.
    const payload = {
      requestDate: new Date().toISOString(),
      videoTitle,
      description,
      topic,
      avatarId,
      id: '',                        // no lo tienes en el formulario → cadena vacía
      userEmail: email || '',        // <— aquí pasamos el email desde el cliente
      tone: tone || '',
      videoCategory: '',             // no lo tienes en el formulario → cadena vacía
      nombreEmpresa: '',             // no lo tienes en el formulario → cadena vacía
      callToAction: callToAction || '',
      specificCallToAction: specificCallToAction || '',
      duration:'',      // no lo tienes en el formulario → cadena vacía
    };

    console.log("📦 Data to send:", payload);

    // 6) Hacemos POST al endpoint de Google Apps Script
    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    // 7) Leemos la respuesta (puede ser JSON o texto plano)
    const text = await response.text();
    console.log("📥 RESPONSE FROM GOOGLE SHEETS:", text);

    // 8) Intentamos parsear la respuesta como JSON. Si falla, devolvemos el texto “rawResponse”.
    try {
      const json = JSON.parse(text);
      return NextResponse.json(json, { status: response.ok ? 200 : 500 });
    } catch (parseError) {
      console.error("⚠️ ERROR PARSING RESPONSE:", parseError);
      return NextResponse.json({ rawResponse: text }, { status: response.ok ? 200 : 500 });
    }

  } catch (err: unknown) {
    let message = 'Error inesperado en el servidor.';
    if (err instanceof Error) message = err.message;
    else if (typeof err === 'string') message = err;
    console.error("❌ Error en /api/send-to-sheet:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
