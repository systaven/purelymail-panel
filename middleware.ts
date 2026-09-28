import { NextFetchEvent, NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { AUTH_COOKIE, clerkEnabled, verifyAuthToken } from '@/lib/auth';

// Every API route except /api/auth/* needs a signed-in caller: either the admin
// password cookie or a Clerk session. What each caller may do (admin vs guest,
// which mailboxes) is checked in the routes themselves via lib/api.ts.
// The client-side AuthGuard only hides pages; this is what protects the data.

function isPublic(req: NextRequest): boolean {
  const path = req.nextUrl.pathname;
  return !path.startsWith('/api/') || path.startsWith('/api/auth/');
}

async function hasAdminCookie(req: NextRequest): Promise<boolean> {
  return Boolean(await verifyAuthToken(req.cookies.get(AUTH_COOKIE)?.value));
}

const unauthorized = () => NextResponse.json({ error: 'Unauthorized', code: 'unauthorized' }, { status: 401 });

const withClerk = clerkMiddleware(async (auth, req) => {
  if (isPublic(req) || (await hasAdminCookie(req))) return;
  const { userId } = await auth();
  if (!userId) return unauthorized();
}, {
  // Optional: Clerk's PEM public key lets the middleware verify sessions without
  // fetching Clerk's JWKS (Clerk dashboard → API keys → Show JWT public key).
  jwtKey: process.env.CLERK_JWT_KEY || undefined,
});

export default async function middleware(req: NextRequest, event: NextFetchEvent) {
  if (clerkEnabled()) {
    return withClerk(req, event);
  }
  if (isPublic(req) || (await hasAdminCookie(req))) {
    return NextResponse.next();
  }
  return unauthorized();
}

export const config = {
  // Clerk needs to see page requests too (for its session handshake).
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
