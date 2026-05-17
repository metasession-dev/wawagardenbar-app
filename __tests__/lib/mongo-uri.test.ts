/**
 * @requirement REQ-040 — Script hardening: refuse mongodb:// URIs without
 * a database path. Closes the D12 root cause where the operator's URI
 * lacked a database, the Mongo driver silently connected to the default
 * DB, and the script's "0 candidates found" was misread as "the script
 * did its job."
 *
 * Tests the pure helper. Script-wiring is verified by manual UAT per
 * `compliance/evidence/REQ-040/uat-checklist.md`.
 */
import { describe, expect, it } from 'vitest';
import { assertMongoUriHasDatabase } from '@/lib/mongo-uri';

describe('assertMongoUriHasDatabase', () => {
  describe('happy paths', () => {
    it('extracts database from path-segment URI', () => {
      const result = assertMongoUriHasDatabase(
        'mongodb://user:pass@host:1234/wawagardenbar'
      );
      expect(result.database).toBe('wawagardenbar');
      expect(result.uri).toBe('mongodb://user:pass@host:1234/wawagardenbar');
    });

    it('extracts database from path-segment URI with querystring', () => {
      const result = assertMongoUriHasDatabase(
        'mongodb://user:pass@host:1234/wawagardenbar?retryWrites=true'
      );
      expect(result.database).toBe('wawagardenbar');
    });

    it('extracts database from mongodb+srv URI', () => {
      const result = assertMongoUriHasDatabase(
        'mongodb+srv://user:pass@cluster.mongo.net/wawagardenbar'
      );
      expect(result.database).toBe('wawagardenbar');
    });

    it('extracts database when both path and authSource are present (path takes precedence)', () => {
      const result = assertMongoUriHasDatabase(
        'mongodb://user:pass@host:1234/wawagardenbar?authSource=admin'
      );
      expect(result.database).toBe('wawagardenbar');
    });
  });

  describe('error paths', () => {
    it('throws when URI has no path (D12 root cause)', () => {
      expect(() =>
        assertMongoUriHasDatabase('mongodb://user:pass@host:1234')
      ).toThrow(/MONGODB_DB_NAME/);
    });

    it('throws when URI has trailing slash but empty path', () => {
      expect(() =>
        assertMongoUriHasDatabase('mongodb://user:pass@host:1234/')
      ).toThrow(/MONGODB_DB_NAME/);
    });

    it('throws when only authSource is set (auth is not the data DB)', () => {
      expect(() =>
        assertMongoUriHasDatabase(
          'mongodb://user:pass@host:1234/?authSource=admin'
        )
      ).toThrow(/MONGODB_DB_NAME/);
    });

    it('throws on non-mongodb scheme', () => {
      expect(() =>
        assertMongoUriHasDatabase(
          'postgres://user:pass@host:5432/wawagardenbar'
        )
      ).toThrow(/Not a mongodb:\/\/ or mongodb\+srv:\/\/ URI/);
    });

    it('throws on minimal host-only URI without port or db', () => {
      expect(() => assertMongoUriHasDatabase('mongodb://host')).toThrow(
        /MONGODB_DB_NAME/
      );
    });
  });
});
