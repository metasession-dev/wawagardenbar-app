import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, SessionData } from '@/lib/session';
import { ApiKeyService } from '@/services/api-key-service';
import { ApiKeyScope } from '@/interfaces/api-key.interface';

interface AuthResult {
  authenticated: boolean;
  source: 'session' | 'api-key' | 'none';
  userId?: string;
  role?: string;
  scopes?: ApiKeyScope[];
}

/**
 * Extract raw API key from request headers.
 * Supports: x-api-key header or Authorization: Bearer wawa_... header.
 */
function extractApiKey(request: NextRequest): string | null {
  const xApiKey = request.headers.get('x-api-key');
  if (xApiKey) return xApiKey;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer wawa_')) {
    return authHeader.slice('Bearer '.length);
  }

  return null;
}

/**
 * Authenticate a request via session OR API key.
 * Use in route handlers that should accept both auth methods.
 *
 * @param request - The incoming NextRequest
 * @param requiredScopes - API key scopes required (only checked for key auth)
 */
export async function authenticateRequest(
  request: NextRequest,
  requiredScopes?: ApiKeyScope[]
): Promise<AuthResult> {
  // Try API key first (stateless, preferred for external clients)
  const rawKey = extractApiKey(request);

  if (rawKey) {
    const { valid, scopes } = await ApiKeyService.validateKey(rawKey);

    if (!valid || !scopes) {
      return { authenticated: false, source: 'none' };
    }

    // Check required scopes
    if (requiredScopes?.length) {
      const hasAllScopes = requiredScopes.every((s) => scopes.includes(s));
      if (!hasAllScopes) {
        return { authenticated: false, source: 'none' };
      }
    }

    return { authenticated: true, source: 'api-key', scopes };
  }

  // Fall back to session auth
  try {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

    if (session.isLoggedIn && session.userId) {
      return {
        authenticated: true,
        source: 'session',
        userId: session.userId,
        role: session.role,
      };
    }
  } catch {
    // Session read failed — treat as unauthenticated
  }

  return { authenticated: false, source: 'none' };
}

/**
 * Convenience: return a 401 JSON response.
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Convenience: return a 403 JSON response.
 */
export function forbiddenResponse(message = 'Forbidden — insufficient scope'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}
