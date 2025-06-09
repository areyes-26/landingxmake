import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, name } = body;

    if (!prompt || !name) {
      return NextResponse.json(
        { error: 'Se requiere prompt y name' },
        { status: 400 }
      );
    }

    // Llamar a la API de HeyGen para crear el avatar
    const response = await fetch('https://api.heygen.com/v2/avatar.create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.HEYGEN_API_KEY!,
      },
      body: JSON.stringify({
        name,
        prompt,
        type: 'text_to_avatar', // Tipo de creación de avatar
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Error de HeyGen: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    let message = 'Error inesperado';
    if (error instanceof Error) message = error.message;
    else if (typeof error === 'string') message = error;
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 