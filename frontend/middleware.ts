/**
 * Next.js Middleware for Route Protection
 *
 * Handles authentication checks and redirects at the edge before pages load.
 * This provides better performance than client-side route protection.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define route patterns
const publicRoutes = ["/auth/login", "/auth/register", "/auth/forgot-password"];
const protectedRoutes = [
  "/dashboard",
  "/projects",
  "/tasks",
  "/analytics",
  "/profile",
  "/organization",
];

// Helper function to check if route is protected
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => pathname.startsWith(route));
}

// Helper function to check if route is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.includes(pathname);
}

// Helper function to extract token from request
function getAuthToken(request: NextRequest): string | null {
  // Try to get token from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try to get token from cookies
  const tokenCookie = request.cookies.get("auth-token");
  if (tokenCookie) {
    return tokenCookie.value;
  }

  return null;
}

// Helper function to validate token (basic check)
function isValidToken(token: string): boolean {
  // Basic validation - check if token exists and has proper format
  // In a real app, you might want to verify the JWT signature
  if (!token || token.length < 10) {
    return false;
  }

  try {
    // Basic JWT format check (header.payload.signature)
    const parts = token.split(".");
    if (parts.length !== 3) {
      return false;
    }

    // Try to decode the payload to check if it's valid JSON
    const payload = JSON.parse(atob(parts[1]));

    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  // TEMPORARILY DISABLED - Using client-side ProtectedRoute instead
  // The middleware can't access localStorage tokens from server-side
  return NextResponse.next();

  /* ORIGINAL CODE - DISABLED
  const { pathname } = request.nextUrl;
  const token = getAuthToken(request);
  const isAuthenticated = token ? isValidToken(token) : false;

  // Handle root path
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Handle protected routes
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      // Store the intended destination for redirect after login
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Allow access to protected route
    return NextResponse.next();
  }

  // Handle public routes (auth pages)
  if (isPublicRoute(pathname)) {
    if (isAuthenticated) {
      // Check if there's a redirect parameter
      const redirectUrl = request.nextUrl.searchParams.get("redirect");
      if (redirectUrl && redirectUrl.startsWith("/")) {
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }

      // Default redirect for authenticated users accessing public routes
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Allow access to public route
    return NextResponse.next();
  }

  // For all other routes, continue normally
  return NextResponse.next();
  */
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
