/**
 * @requirement REQ-119 — AC2 (ADR-009)
 * @srs REQ-AUTHA-004
 *
 * Guard: no code outside the role helper modules compares or reads
 * `session.role` directly. Authorization goes through the any-of helpers in
 * `lib/session.ts` / `lib/roles.ts` (`hasAnyRole`, `isAdmin`, `isStaff`, ...),
 * so a member with several roles is never judged on one of them.
 *
 * Add a new check with the helpers, not with `session.role ===`. Reading a
 * stored `role` for display or for the audit trail goes through
 * `getPrimaryRole(...)`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SCAN_DIRS = ['app', 'lib', 'services', 'components', 'hooks'];
const SCAN_FILES = ['proxy.ts'];
/**
 * The helper modules own the back-compat `role` field; the migration planner
 * reads the legacy `role` of raw documents by definition.
 */
const ALLOWED = new Set([
  'lib/session.ts',
  'lib/roles.ts',
  'lib/staff-roles-migration.ts',
]);

const FORBIDDEN: Array<{ name: string; pattern: RegExp }> = [
  { name: 'session.role (any use)', pattern: /\bsession\??\.role\b/ },
  {
    name: '<x>.role compared with ===, !==, == or !=',
    pattern: /\.role\s*(===|!==|==|!=)(?!=)/,
  },
  {
    name: '.includes(<x>.role)',
    pattern: /\.includes\(\s*[\w.?]+\.role\b/,
  },
];

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('REQ-119 AC2 — no direct role checks outside the helper modules', () => {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), files);
  for (const file of SCAN_FILES) files.push(path.join(ROOT, file));

  it('scans a meaningful number of files', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('finds no forbidden pattern', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      if (ALLOWED.has(rel)) continue;
      const lines = stripComments(fs.readFileSync(file, 'utf8')).split('\n');
      lines.forEach((line, index) => {
        for (const { name, pattern } of FORBIDDEN) {
          if (pattern.test(line)) {
            offenders.push(`${rel}:${index + 1}  [${name}]  ${line.trim()}`);
          }
        }
      });
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('the matchers do catch the patterns they are meant to forbid', () => {
    const samples = [
      "if (session.role === 'admin') {}",
      "if (session?.role !== 'csr') {}",
      "['admin'].includes(session.role)",
      "if (admin.role === 'super-admin') {}",
      'x.includes(user.role)',
    ];
    for (const sample of samples) {
      expect(
        FORBIDDEN.some(({ pattern }) => pattern.test(sample)),
        sample
      ).toBe(true);
    }
  });
});
