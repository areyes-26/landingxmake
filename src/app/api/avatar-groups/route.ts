// src/app/api/avatar-groups/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-api-key': process.env.HEYGEN_API_KEY!,
    },
  };

  const res = await fetch(
    'https://api.heygen.com/v2/avatar_group.list',
    options
  );
  if (!res.ok) {
    return NextResponse.json(
      { error: `No pude traer los grupos: ${res.statusText}` },
      { status: 500 }
    );
  }
  const json = await res.json();
  // json.data.avatar_group_list es el array de grupos
  return NextResponse.json({ data: json.data.avatar_group_list });
}
