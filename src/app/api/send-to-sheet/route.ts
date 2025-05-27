import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📦 Body recibido:", body);

    const { videoTitle, description, topic, avatarId } = body;

    // Validación básica
    if (!videoTitle || !description || !topic || !avatarId) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (videoTitle, description, topic, avatarId).' },
        { status: 400 }
      );
    }

    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;
    console.log("🔗 GOOGLE_SCRIPT_URL:", googleScriptUrl);

    if (!googleScriptUrl) {
      return NextResponse.json(
        { error: 'Variable de entorno GOOGLE_SCRIPT_URL no configurada.' },
        { status: 500 }
      );
    }

    const response = await fetch(googleScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoTitle, description, topic, avatarId }),
    });

    const text = await response.text();

    try {
      const json = JSON.parse(text);
      return NextResponse.json(json);
    } catch {
      return NextResponse.json({ rawResponse: text });
    }

  } catch (err: any) {
    console.error("❌ Error en el endpoint:", err);
    return NextResponse.json(
      { error: err.message || 'Error inesperado en el servidor.' },
      { status: 500 }
    );
  }
}
