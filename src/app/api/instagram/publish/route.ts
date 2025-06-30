import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId, videoUrl, caption } = await request.json();
    if (!userId || !videoUrl) {
      return NextResponse.json({ error: 'userId and videoUrl are required' }, { status: 400 });
    }

    // Llamar a la cloud function
    const res = await fetch('https://us-central1-landing-x-make.cloudfunctions.net/publishToInstagram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, videoUrl, caption })
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Failed to publish to Instagram' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
} 