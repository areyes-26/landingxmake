// src/app/api/avatars-by-group/route.ts
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('groupId');
    if (!groupId) {
      return NextResponse.json({ error: 'Falta el query param groupId' }, { status: 400 });
    }

    // <-- Aquí invocamos SOLO al endpoint de ese grupo:
    const res = await fetch(
      `https://api.heygen.com/v2/avatar_group/${groupId}/avatars`,
      {
        headers: {
          accept: 'application/json',
          'x-api-key': process.env.HEYGEN_API_KEY!,
        },
      }
    );
    if (!res.ok) {
      return NextResponse.json(
        { error: `HeyGen devolvió ${res.status}` },
        { status: res.status }
      );
    }
    const hey = await res.json();

    // hey.data.avatar_list es el array que nos interesa
    const list = hey.data.avatar_list.map((a: { id: string; name: string; preview_image: string }) => ({
      id: a.id,
      name: a.name,
      imageUrl: a.preview_image,
      dataAiHint: 'avatar-image',
    }));

    return NextResponse.json({ data: list }, { status: 200 });
  } catch (err: unknown) {
    let message = 'Error inesperado';
    if (err instanceof Error) message = err.message;
    else if (typeof err === 'string') message = err;
    console.error(err);
    console.error(err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
