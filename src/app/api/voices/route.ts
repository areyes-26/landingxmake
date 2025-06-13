import { NextResponse } from 'next/server';
import { getVoices } from '@/lib/heygen';

export async function GET() {
  try {
    console.log('Fetching voices from HeyGen...');
    const voices = await getVoices();
    console.log('Voices received:', voices);
    return NextResponse.json({ data: voices });
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voices' },
      { status: 500 }
    );
  }
} 