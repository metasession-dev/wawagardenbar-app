/**
 * @requirement REQ-077 — Expandable incidents
 * @requirement SRS REQ-INV-017 — Incidents URL state: filter + expanded-row hash
 * @requirement Risk register R-004 — URL-hash fidelity + injection-surface defence
 *
 * Pins the hash-parsing contract for `<IncidentRow>` initial expansion
 * state.
 *
 * R-004's load-bearing controls live in `parseExpandedFromHash`:
 *   1. Each comma-separated segment is validated against
 *      `/^[a-f0-9]+$/` (the ObjectId hex pattern).
 *   2. Non-matching segments are silently discarded.
 *   3. Empty / malformed / missing `#open=...` returns an empty Set —
 *      the page defaults to all rows collapsed.
 *
 * The validated IDs are used ONLY to drive `useState(initial)` for
 * expansion state (`expanded.has(id)`) — never `dangerouslySetInnerHTML`,
 * never `eval`. The regex enforces the boundary.
 */
import { describe, it, expect } from 'vitest';
import { parseExpandedFromHash } from '@/components/features/admin/incident-row';

describe('REQ-077 / R-004: parseExpandedFromHash — URL-hash validation', () => {
  it('returns empty Set for empty / undefined hash', () => {
    expect(parseExpandedFromHash('')).toEqual(new Set());
    expect(parseExpandedFromHash(undefined)).toEqual(new Set());
  });

  it('returns empty Set when hash has no `open=` segment', () => {
    expect(parseExpandedFromHash('#filter=cash')).toEqual(new Set());
    expect(parseExpandedFromHash('foo=bar')).toEqual(new Set());
  });

  it('parses a single ObjectId from `#open=...`', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(parseExpandedFromHash(`#open=${id}`)).toEqual(new Set([id]));
  });

  it('parses multiple comma-separated ObjectIds', () => {
    const a = '507f1f77bcf86cd799439011';
    const b = '60c72b2f9b1e8b3a4c8d4f23';
    expect(parseExpandedFromHash(`#open=${a},${b}`)).toEqual(new Set([a, b]));
  });

  it('silently discards non-ObjectId segments (R-004 injection defence)', () => {
    const valid = '507f1f77bcf86cd799439011';
    const result = parseExpandedFromHash(
      `#open=${valid},<script>alert(1)</script>,DROP TABLE,not-hex-zZ`
    );
    expect(result).toEqual(new Set([valid]));
  });

  it('rejects shorter-than-ObjectId or longer-than-ObjectId hex strings ONLY when explicitly enforced (uses /^[a-f0-9]+$/ — length flexibility OK)', () => {
    // The spec uses /^[a-f0-9]+$/ which doesn't enforce length 24. This
    // is deliberate: ObjectIds are 24 hex chars but the regex's load-bearing
    // job is "no script-injection", not "exact length". Length validation
    // would just add false-positive rejections without security benefit.
    const valid24 = '507f1f77bcf86cd799439011';
    const shortHex = 'abc123';
    const longHex = 'abcdef0123456789abcdef0123456789abcdef'; // 38 chars
    const result = parseExpandedFromHash(
      `#open=${valid24},${shortHex},${longHex}`
    );
    expect(result.has(valid24)).toBe(true);
    expect(result.has(shortHex)).toBe(true);
    expect(result.has(longHex)).toBe(true);
  });

  it('handles `#` prefix consistently (with or without)', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(parseExpandedFromHash(`#open=${id}`)).toEqual(new Set([id]));
    expect(parseExpandedFromHash(`open=${id}`)).toEqual(new Set([id]));
  });

  it('returns empty Set when ALL segments are invalid (graceful-degradation default)', () => {
    expect(parseExpandedFromHash('#open=<script>,DROP,not-hex,$$$')).toEqual(
      new Set()
    );
  });

  it('handles trailing commas gracefully (no empty-string ids)', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(parseExpandedFromHash(`#open=${id},,,`)).toEqual(new Set([id]));
    expect(parseExpandedFromHash(`#open=,${id},`)).toEqual(new Set([id]));
  });

  it('ignores hash params adjacent to `open=` (no cross-key contamination)', () => {
    const id = '507f1f77bcf86cd799439011';
    expect(parseExpandedFromHash(`#kind=cash&open=${id}`)).toEqual(
      new Set([id])
    );
  });
});
