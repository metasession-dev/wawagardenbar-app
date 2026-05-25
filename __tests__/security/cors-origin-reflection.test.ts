/**
 * CORS origin-reflection hardening (REQ-047, issue #128).
 *
 * `applyCors` must reflect an origin into `Access-Control-Allow-Origin` only
 * when it is an exact allow-list match, and must NOT honour a '*' entry —
 * reflecting an arbitrary origin alongside `Access-Control-Allow-Credentials:
 * true` is a CORS misconfiguration. Guards the fix against regression.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { applyCors } from '@/lib/cors';

const ALLOWED = 'https://admin.wawagardenbar.com';
const OTHER = 'https://evil.example.com';

function callApplyCors(origin: string | null): NextResponse {
  const headers = new Headers();
  if (origin !== null) headers.set('origin', origin);
  const request = { headers } as unknown as NextRequest;
  const response = new NextResponse(null);
  applyCors(request, response);
  return response;
}

describe('applyCors origin reflection', () => {
  const original = process.env.CORS_ALLOWED_ORIGINS;
  beforeEach(() => {
    process.env.CORS_ALLOWED_ORIGINS = ALLOWED;
  });
  afterEach(() => {
    process.env.CORS_ALLOWED_ORIGINS = original;
  });
  it('reflects an exact allow-list match', () => {
    const res = callApplyCors(ALLOWED);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ALLOWED);
    expect(res.headers.get('Vary')).toBe('Origin');
  });
  it('does not reflect an origin that is not allow-listed', () => {
    const res = callApplyCors(OTHER);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(res.headers.get('Vary')).toBeNull();
  });
  it('does not reflect an arbitrary origin when the allow-list is "*"', () => {
    process.env.CORS_ALLOWED_ORIGINS = '*';
    const res = callApplyCors(OTHER);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
  it('does not reflect when no allow-list is configured', () => {
    process.env.CORS_ALLOWED_ORIGINS = '';
    const res = callApplyCors(ALLOWED);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
  it('always sets the static CORS headers regardless of origin', () => {
    const res = callApplyCors(OTHER);
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
    expect(res.headers.get('Access-Control-Max-Age')).toBe('86400');
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });
});
