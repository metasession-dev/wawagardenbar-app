import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, type AuthResult } from '@/lib/api-key-validator';
import { ApiKeyScope } from '@/interfaces/api-key.interface';
import { connectDB } from '@/lib/mongodb';
import { isAdmin, isCustomerSession } from '@/lib/roles';

/**
 * Standard API envelope for all public API responses.
 */
interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  /** Machine-readable error code (REQ-120 customer order errors). */
  code?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    timestamp: string;
  };
}

/**
 * Pagination parameters parsed from query string.
 */
interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

/**
 * Parse pagination query params with sane defaults and caps.
 */
export function parsePagination(
  searchParams: URLSearchParams
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(
      1,
      parseInt(searchParams.get('limit') || String(DEFAULT_PAGE_SIZE), 10) ||
        DEFAULT_PAGE_SIZE
    )
  );
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Build a successful JSON response with the standard envelope.
 */
export function apiSuccess<T>(
  data: T,
  status = 200,
  pagination?: { page: number; limit: number; total: number }
): NextResponse<ApiEnvelope<T>> {
  const meta: ApiEnvelope<T>['meta'] = { timestamp: new Date().toISOString() };
  if (pagination) {
    meta.page = pagination.page;
    meta.limit = pagination.limit;
    meta.total = pagination.total;
    meta.totalPages = Math.ceil(pagination.total / pagination.limit);
  }
  return NextResponse.json({ success: true, data, meta }, { status });
}

/**
 * Build an error JSON response with the standard envelope.
 */
export function apiError(
  message: string,
  status = 400,
  code?: string
): NextResponse<ApiEnvelope<null>> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...(code ? { code } : {}),
      meta: { timestamp: new Date().toISOString() },
    },
    { status }
  );
}

/**
 * Guard a route handler: authenticate via API key (with required scopes),
 * connect to DB, then call the handler. Returns error response on failure.
 */
export async function withApiAuth(
  request: NextRequest,
  requiredScopes: ApiKeyScope[],
  handler: (auth: AuthResult) => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await authenticateRequest(request, requiredScopes);
  if (!auth.authenticated) {
    const missingScope = auth.source === 'api-key';
    return apiError(
      missingScope
        ? 'Forbidden — insufficient API key scope'
        : 'Unauthorized — provide a valid API key',
      missingScope ? 403 : 401
    );
  }
  await connectDB();
  return handler(auth);
}

/**
 * Parse a JSON body safely, returning null on failure.
 */
export async function parseJsonBody<T>(
  request: NextRequest
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Parse optional ISO date string from query params.
 */
export function parseDateParam(value: string | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return isNaN(d.getTime()) ? undefined : d;
}

/**
 * Serialize a Mongoose document (or lean object) to a plain JSON-safe object.
 */
export function serialize<T>(doc: T): T {
  return JSON.parse(JSON.stringify(doc));
}

/**
 * REQ-120 — tabs are staff-only. Returns an error response when the caller is
 * not a staff key or staff session (writes), or is a customer key or session
 * (reads); returns null when the call may proceed.
 */
export function rejectNonStaffTabAccess(
  auth: AuthResult,
  mode: 'read' | 'write'
): NextResponse<ApiEnvelope<null>> | null {
  const isStaffCaller = isAdmin({ role: auth.role });
  if (mode === 'write' && !isStaffCaller) {
    return apiError('Forbidden — tab writes need a staff-scoped key', 403);
  }
  if (mode === 'read' && isCustomerSession({ role: auth.role })) {
    return apiError('Forbidden — tabs are managed by staff', 403);
  }
  return null;
}
