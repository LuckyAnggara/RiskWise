// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This function can be named `middleware` and will be automatically
// discovered by Next.js if it's in the root of your `src` or `app` directory.
export function middleware(request: NextRequest) {
  // Minimal middleware that does nothing but pass the request through.
  // This satisfies Next.js's requirement for an exported middleware function
  // if a `middleware.ts` file exists.
  // If no middleware logic is needed, this file can ideally be deleted.
  return NextResponse.next();
}

// Optionally, to restrict the middleware to specific paths, you can add a config:
// export const config = {
//   matcher: '/about/:path*', // Example: only run on /about and its sub-paths
// };
// If no config.matcher is provided, it runs on all paths by default.
