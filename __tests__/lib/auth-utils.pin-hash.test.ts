/**
 * @requirement REQ-117 (AC5, ADR-008) — the PIN is stored as a keyed hash,
 * never in plaintext, and compared in constant time.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import { hashPin, verifyPinHash } from '@/lib/auth-utils';

beforeEach(() => {
  vi.stubEnv('SESSION_PASSWORD', 'a'.repeat(32));
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('REQ-117 hashPin / verifyPinHash', () => {
  it('AC5 — hashes to a 64-char hex string and never contains the PIN', () => {
    const hash = hashPin('123456');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('123456');
  });

  it('AC5 — is not a plain SHA-256 of the PIN (a database copy cannot be reversed by hashing 10^6 values)', () => {
    const plain = crypto.createHash('sha256').update('123456').digest('hex');
    expect(hashPin('123456')).not.toBe(plain);
  });

  it('AC5 — is deterministic for the same key and differs per PIN', () => {
    expect(hashPin('123456')).toBe(hashPin('123456'));
    expect(hashPin('123456')).not.toBe(hashPin('123457'));
  });

  it('AC5 — a different SESSION_PASSWORD gives a different hash', () => {
    const before = hashPin('123456');
    vi.stubEnv('SESSION_PASSWORD', 'b'.repeat(32));
    expect(hashPin('123456')).not.toBe(before);
  });

  it('AC5 — verifyPinHash accepts the right PIN and rejects a wrong one', () => {
    const hash = hashPin('654321');
    expect(verifyPinHash('654321', hash)).toBe(true);
    expect(verifyPinHash('111111', hash)).toBe(false);
  });

  it('AC5 — verifyPinHash does not throw on a malformed stored value', () => {
    expect(verifyPinHash('654321', 'not-hex')).toBe(false);
    expect(verifyPinHash('654321', '')).toBe(false);
  });

  it('AC5 — throws when SESSION_PASSWORD is not set (no silent unkeyed hash)', () => {
    vi.stubEnv('SESSION_PASSWORD', '');
    expect(() => hashPin('123456')).toThrow(/SESSION_PASSWORD/);
  });
});
