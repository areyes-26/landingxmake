import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      );
    }

    // Verify state matches the one we sent
    const cookieStore = await cookies();
    const savedState = cookieStore.get('instagram_state')?.value;
    if (savedState !== state) {
      return NextResponse.json(
        { error: 'Invalid state parameter' },
        { status: 401 }
      );
    }

    // Redirect to Firebase Cloud Function for token exchange
    const cloudFunctionUrl = process.env.NEXT_PUBLIC_INSTAGRAM_FUNCTION_URL!;
    const callbackUrl = `${cloudFunctionUrl}?code=${code}&state=${state}`;
    redirect(callbackUrl);

  } catch (error) {
    console.error('Instagram callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
