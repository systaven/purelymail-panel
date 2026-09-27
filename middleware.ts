import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, verifyAuthToken } from '@/lib/auth';

// Require a valid auth cookie for every API route except the auth endpoints.
// The client-side AuthGuard only hides pages; this is what actually protects the data.
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const payload = await verifyAuthToken(req.cookies.get(AUTH_COOKIE)?.value);
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
