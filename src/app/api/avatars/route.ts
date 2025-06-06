import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://api.heygen.com/v2/avatars', {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-api-key': process.env.HEYGEN_API_KEY!, // <- Asegurate de tener esto en tu .env.local
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
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
