# Test Scope — REQ-033

**Risk Level:** MEDIUM-HIGH (financial-data-adjacent, 25+ migration sites)
**Requirement:** App-wide Unit-of-Measurement (UoM) registry — configurable in Settings, replacing free-text `unit` strings on Expense, Inventory, MenuItem and any consuming UI. Prereq for REQ-034 recipe ingredient ↔ inventory unit-matching.
**GitHub Issue:** [#73](https://github.com/metasession-dev/wawagardenbar-app/issues/73)
**Date:** 2026-05-01

## Test Approach

MEDIUM-HIGH-risk additive feature on top of REQ-028's existing settings registry pattern. No schema _removal_, no new collection, no destructive migration. Free-text `unit` fields gain a registry-validated dropdown source; existing rows are normalised by an idempotent backfill script.

**Universal gates (mandatory):**

- TypeScript compilation: 0 errors
- SAST (Semgrep): 0 new high/critical findings
- Dependency audit: 0 new high/critical vulnerabilities (REQ-031 baseline preserved)
- Vitest unit suite: 462 baseline + new tests all pass
- Playwright E2E: existing suites unchanged + new Settings UoM CRUD spec
- Human code review via PR (×1 — MEDIUM baseline single-reviewer policy)

**Security testing:**

- [ ] Access control: UoM CRUD is super-admin only (page guard + `requireSuperAdmin` in the action). Same surface as REQ-028 expense-categories — no new auth surface.
- [ ] Audit logging: SystemSettingsModel's existing `changeHistory` array captures every UoM update with `{ value, changedBy, changedAt, reason }` — no new audit-log code, just reusing the registry pattern.
- [ ] Input validation: registry entries validated by Zod schema before write. UoM `id` is a stable slug (lowercase, no spaces). Free-text values rejected at the action boundary.
- [ ] Backfill safety: script is idempotent (skip-already-migrated), reports unrecognised values to stdout for manual review rather than auto-mapping ambiguously.

**Additional MEDIUM-HIGH testing:**

- [ ] Independent review: single human reviewer per Risk-Tiered Review Policy. No AI-involvement bump because the change is contained, deterministic, and all logic is in pure helpers + service-layer methods that mirror REQ-028.
- [ ] Penetration testing: not warranted — no new endpoints, no new auth surface, no schema additions beyond a soft-validated string field.

## Out of Scope (per design decision)

- **Unit conversion factors** (e.g. 1 kg = 1000 g). v1 is strict-match-only — recipes (REQ-034) must use identical units to the inventory record. Documented as future enhancement.
- **Tenant-scoped UoM**: single registry per environment.
- **Locale-specific UoM names**: labels are English-only in v1.

## Rollback / Recovery

Single additive change. Rollback = revert the merge commit. The backfill script is reversible only by hand (the original free-text values are not retained), so the rollback procedure includes running the migration in reverse from a previous DB snapshot if necessary. Recommend keeping the pre-migration `unit` values in a side collection during rollout (`scripts/backfill-unit-values.ts` writes a `_uom-backfill-{timestamp}.json` audit file before mutating; revert by re-applying that file).
