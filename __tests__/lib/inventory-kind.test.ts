/**
 * @requirement REQ-034 — AC1
 * Inventory schema accepts `kind` discriminator; default = 'menu-item'.
 * Backfill script idempotent.
 *
 * STUB: filled in during Phase A tests-first commit before implementation lands.
 */
import { describe, it } from 'vitest';

describe.skip('REQ-034 AC1 — Inventory.kind discriminator', () => {
  it('accepts kind: menu-item (default)', () => {});
  it('accepts kind: kitchen-ingredient', () => {});
  it('rejects unknown kind value', () => {});
  it('backfill script sets kind: menu-item on legacy rows', () => {});
  it('backfill script is idempotent on re-run', () => {});
});
