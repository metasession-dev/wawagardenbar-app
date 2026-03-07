import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { routePermissions } from '@/lib/permissions';
import { UserRole } from '@/interfaces/user.interface';
import { checkRateLimit, resolvePreset } from '@/lib/rate-limiter';
import { applyCors, buildPreflightResponse } from '@/lib/cors';

/**
 * Extract the client IP address from common proxy headers.
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    '127.0.0.1'
  );
}

/**
 * Return a JSON error response with CORS headers attached.
 */
function jsonError(
  request: NextRequest,
  message: string,
  status: number
): NextResponse {
  const response = NextResponse.json({ error: message }, { status });
  applyCors(request, response);
  return response;
}

/**
 * Next.js proxy for route protection
 * Checks user authentication and role-based permissions
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static/public page routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/login' ||
    pathname === '/unauthorized' ||
    pathname === '/forbidden'
  ) {
    return NextResponse.next();
  }

  // ── Handle CORS preflight for API routes ─────────────────────────────
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return buildPreflightResponse(request);
  }

  // ── Rate limiting on all API routes ──────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(request);
    const preset = resolvePreset(pathname);
    const { allowed, retryAfter } = checkRateLimit(`${ip}:${preset}`, preset);

    if (!allowed) {
      const errResponse = jsonError(request, 'Too many requests', 429);
      errResponse.headers.set('Retry-After', String(retryAfter));
      return errResponse;
    }
  }

  // ── Protect /api/admin/* routes (always require admin session) ───────
  if (pathname.startsWith('/api/admin/')) {
    try {
      const adminResponse = NextResponse.next();
      const session = await getIronSession<SessionData>(
        request,
        adminResponse,
        sessionOptions
      );

      if (!session.isLoggedIn) {
        return jsonError(request, 'Unauthorized', 401);
      }

      if (session.role !== 'admin' && session.role !== 'super-admin') {
        return jsonError(request, 'Forbidden', 403);
      }
    } catch {
      return jsonError(request, 'Unauthorized', 401);
    }
  }

  // ── Attach CORS headers to all API responses ─────────────────────────
  if (pathname.startsWith('/api/')) {
    const apiResponse = NextResponse.next();
    applyCors(request, apiResponse);
    return apiResponse;
  }

  // Check if route requires authentication
  if (pathname.startsWith('/dashboard')) {
    try {
      // Get session from cookies
      const response = NextResponse.next();
      const session = await getIronSession<SessionData>(
        request,
        response,
        sessionOptions
      );

      // Check if user is authenticated
      if (!session.isLoggedIn || !session.userId) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Check if user has a role
      if (!session.role) {
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }

      // Block customers from accessing dashboard
      if (session.role === 'customer') {
        return NextResponse.redirect(new URL('/', request.url));
      }

      // Check route-specific permissions
      const matchedRoute = findMatchingRoute(pathname);
      if (matchedRoute) {
        const allowedRoles = routePermissions[matchedRoute];

        if (allowedRoles && !allowedRoles.includes(session.role as UserRole)) {
          // Staff trying to access higher-level route
          if (session.role === 'csr' || session.role === 'admin') {
            return NextResponse.redirect(new URL('/dashboard/forbidden', request.url));
          }
          // Other unauthorized access
          return NextResponse.redirect(new URL('/unauthorized', request.url));
        }
      }

      return response;
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

/**
 * Find matching route from route permissions
 * Handles dynamic routes and nested paths
 */
function findMatchingRoute(pathname: string): string | null {
  // Exact match
  if (routePermissions[pathname]) {
    return pathname;
  }

  // Check for parent routes
  const routes = Object.keys(routePermissions).sort((a, b) => b.length - a.length);

  for (const route of routes) {
    if (pathname.startsWith(route + '/') || pathname === route) {
      return route;
    }
  }

  // Default dashboard permission
  if (pathname.startsWith('/dashboard')) {
    return '/dashboard';
  }

  return null;
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
