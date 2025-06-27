import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { plan: string } }
) {
  try {
    const { plan } = params;
    
    // Validar el plan
    const validPlans = ['freeplan', 'basicplan', 'proplan'];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      );
    }

    // Construir la ruta al archivo JSON
    const filePath = path.join(process.cwd(), 'public', 'avatar-list', `${plan}.json`);
    
    // Leer el archivo JSON
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const avatarData = JSON.parse(fileContent);

    return NextResponse.json(avatarData);
  } catch (error) {
    console.error('Error loading avatar data:', error);
    return NextResponse.json(
      { error: 'Failed to load avatar data' },
      { status: 500 }
    );
  }
} 