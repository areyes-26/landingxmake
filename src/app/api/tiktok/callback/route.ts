import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const scopes = searchParams.get('scopes');
  
  // Redirigir a la Firebase Function con todos los parámetros
  const redirectUrl = `https://us-central1-landing-x-make.cloudfunctions.net/tiktokCallback?code=${code}&state=${state}&scopes=${scopes}`;
  
  return NextResponse.redirect(redirectUrl);
} 