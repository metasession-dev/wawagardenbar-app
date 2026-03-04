import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const DEFAULT_ALLOWED_HEADERS =
  'Content-Type, Authorization, x-api-key, x-internal-auth';

/**
 * Resolve allowed origins from environment variable or fall back to same-origin.
 */
function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? '';
  if (!raw) return [];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Attach CORS headers to a response.
 * Returns true if the request is an OPTIONS preflight (caller should return early).
 */
export function applyCors(
  request: NextRequest,
  response: NextResponse
): void {
  const origin = request.headers.get('origin') ?? '';
  const allowedOrigins = getAllowedOrigins();

  const isAllowed =
    allowedOrigins.length === 0
      ? false
      : allowedOrigins.includes(origin) || allowedOrigins.includes('*');

  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }

  response.headers.set('Access-Control-Allow-Methods', DEFAULT_ALLOWED_METHODS);
  response.headers.set(
    'Access-Control-Allow-Headers',
    DEFAULT_ALLOWED_HEADERS
  );
  response.headers.set('Access-Control-Max-Age', '86400');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
}

/**
 * Build a preflight (OPTIONS) response with CORS headers.
 */
export function buildPreflightResponse(request: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  applyCors(request, response);
  return response;
}
