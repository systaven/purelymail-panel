// Browser-side switch for Clerk: the publishable key is inlined at build time.
export const CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
export const clerkConfigured = Boolean(CLERK_PUBLISHABLE_KEY);
