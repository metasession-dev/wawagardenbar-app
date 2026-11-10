/**
 * @requirement REQ-120 — AC4
 * @srs REQ-CHECKOUT-012
 *
 * The `WGB` + timestamp order-number format is gone: order numbers come only
 * from `OrderService.generateOrderNumber()` (`WG` + 10 digits).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (
      ['node_modules', '.next', '__tests__', 'e2e', '.git'].includes(entry.name)
    )
      continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('single order-number format', () => {
  it('no source file builds a WGB-prefixed order number', () => {
    const offenders = [
      ...walk(path.join(ROOT, 'app')),
      ...walk(path.join(ROOT, 'services')),
      ...walk(path.join(ROOT, 'lib')),
    ].filter((f) =>
      /`WGB\$\{|'WGB'\s*\+|"WGB"\s*\+/.test(fs.readFileSync(f, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });

  it('generateOrderNumber is public and yields WG + 10 digits in format', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'services/order-service.ts'),
      'utf8'
    );
    expect(src).toMatch(/static async generateOrderNumber\(\)/);
    expect(src).toMatch(
      /`WG\$\{dateKey\}\$\{String\(counter\.seq\)\.padStart\(4, '0'\)\}`/
    );
  });
});
