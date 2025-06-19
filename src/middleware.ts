import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Rutas que no requieren autenticación
const PUBLIC_PATHS = ['/inicio', '/auth', '/privacy'];

// Rutas que son específicamente para usuarios NO autenticados
const UNAUTH_PATHS = ['/auth'];

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const authToken = request.cookies.get('authToken');

  // Determinar si el usuario está autenticado
  const isAuthenticated = !!(sessionCookie || authToken);

  // Verificar si la ruta actual es pública
  const isPublicPath = PUBLIC_PATHS.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );

  // Verificar si la ruta es específicamente para usuarios no autenticados
  const isUnauthPath = UNAUTH_PATHS.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + '/')
  );

  // Si el usuario está autenticado y trata de acceder a rutas de auth
  if (isAuthenticated && isUnauthPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Si el usuario NO está autenticado y trata de acceder a una ruta protegida
  if (!isAuthenticated && !isPublicPath) {
    const searchParams = new URLSearchParams({
      redirect: request.nextUrl.pathname
    });
    return NextResponse.redirect(new URL(`/auth?${searchParams}`, request.url));
  }

  return NextResponse.next();
}

// Configurar las rutas que el middleware debe manejar
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 