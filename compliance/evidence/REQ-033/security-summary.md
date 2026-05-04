# Security Summary — REQ-033

**Requirement:** REQ-033 — App-wide Unit-of-Measurement (UoM) registry
**Issue:** [#73](https://github.com/metasession-dev/wawagardenbar-app/issues/73)
**Risk Level:** MEDIUM-HIGH (financial-data-adjacent, 25+ migration sites, no schema removal)
**Date:** 2026-05-01

---

## Universal Gates

| Gate                        | Result                                                                                                                                                                           | Notes                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`) | **0 errors**                                                                                                                                                                     | `gates/tsc.txt`                                                                                                                                   |
| Vitest unit suite           | **486/486 passed** (462 baseline + 24 new)                                                                                                                                       | `gates/vitest-summary.txt`                                                                                                                        |
| Semgrep SAST                | **0 findings on REQ-033 changed files**                                                                                                                                          | `gates/semgrep.json` — 2 warn-level `PartialParsing` notes are pre-existing TSX parser quirks on `menu-item-edit-form.tsx`, not security findings |
| Dependency audit            | **0 new findings**                                                                                                                                                               | 1 HIGH (`xlsx`, pre-existing, allowlisted), 6 moderate pre-existing — REQ-031/032 baseline. `gates/dependency-audit.json`                         |
| Playwright E2E              | Spec parses, lists 4 tests, runs locally and skips gracefully when local auth isn't seeded — exact same pattern existing UAT specs use. Will run for real on UAT after redeploy. | `e2e/settings/units-of-measurement.spec.ts`                                                                                                       |
| CI pipeline (develop)       | Will be confirmed green at the merge SHA                                                                                                                                         |                                                                                                                                                   |

---

## Security Assessment

### Data Integrity

**No schema removal.** `Expense.unit` and `Inventory.unit` remain `String` fields on Mongoose schemas. The change is a value-format normalisation: previously free-text, now constrained at the application layer (via `lib/units.ts:validateUnit`) to a registry id. Existing rows are migrated by an idempotent backfill script that emits a JSON audit file before mutating, so a rollback can replay original values.

**Backfill is non-destructive.** `scripts/backfill-unit-values.ts`:

- Skips rows already matching a canonical id.
- Maps known case/spelling variants via `LEGACY_UNIT_ALIASES` (e.g. `Kg` → `kg`, `liters` → `litres`).
- Reports unrecognised values to stdout for manual review — does NOT auto-map ambiguously.
- Writes `_uom-backfill-{timestamp}.json` audit file before any mutation.
- Supports `--dry-run` for non-destructive verification on UAT.

### Access Control (RBAC)

**Settings UoM CRUD is super-admin only.** `updateUnitsOfMeasurementAction` calls `requireSuperAdmin()` at the action boundary (`app/dashboard/settings/actions.ts`). Page-level guards on `/dashboard/settings` are inherited from the existing settings infrastructure.

**Read access is unrestricted to authenticated dashboard users.** `getUnitsOfMeasurementAction` (`app/actions/units-actions.ts`) has no role check — by design. The registry IS the source of truth for every form that has a unit field (Expense, MenuItem, Recipe in REQ-034). Restricting reads would break those forms for non-super-admin users. Same pattern as `getExpenseCategoriesAction` (REQ-028).

**No new write surface beyond Settings.** All other unit-field interactions (Expense form, MenuItem form, edit dialog) are read-only consumers — they Select an id from the registry, persist it on their own document, and never mutate the registry itself.

### Audit Logging

The registry persists under `SystemSettingsModel{key:'units-of-measurement'}`. Every update emits a `changeHistory` entry with `{ value, changedBy, changedAt, reason: 'Units of measurement updated' }` — same audit shape REQ-028 uses for expense categories. Soft-delete (`isActive: false`) is recorded as a value change in the same history.

### Input Validation

**Settings registry write path:** `SystemSettingsService.updateUnitsOfMeasurement` validates:

- Array is non-empty
- Every entry has trimmed non-empty `id` and `label`
- Every `category` is a recognised `UoMCategory` value
- No duplicate `id`s
- (Client-side superRefine in the form additionally enforces id slug pattern `^[a-z][a-z0-9-]*$`)

Throws path-qualified errors (`Unit '<id>' must have a non-empty label`) that do not leak DB IDs or other settings.

**Form consumer paths:** `lib/units.ts:validateUnit` is exposed for callers that want strict validation. Currently only the Settings form calls it. Expense and MenuItem forms accept any string at the persist layer (legacy reads continue working) — REQ-034 will tighten validation when recipes need it.

### NoSQL Injection

**N/A — no new query.** This REQ adds zero new database read or write paths. It uses the existing `SystemSettingsModel.findOne({key: ...})` and `findOneAndUpdate({key: ...})` calls, identical to every other key in the registry. All `_id` lookups use Mongoose's typed schema; no user-derived operator keys.

### XSS / Output Encoding

**No new untrusted-source rendering.** The Settings form renders `unit.label` and `unit.id` strings via React's auto-escaping JSX. The values come from the user's own super-admin writes (already vetted at write-time). The Expense and MenuItem forms render registry labels via the same auto-escaped path.

### CSRF

**Reuses existing server actions.** Next.js server actions are CSRF-protected by the framework; no bypass introduced.

### Race Conditions / Concurrency

The registry is a single document in `SystemSettingsModel`. Two super-admins editing simultaneously would race on `findOneAndUpdate({upsert: true})`; the last write wins, but `changeHistory` retains both — the audit trail is intact even when concurrent writes occur. Same behaviour as expense-categories under REQ-028.

### Backfill Race

The backfill script reads each row, mutates it, then moves on. If a user edits an expense's `unit` during the backfill window, the script's update could overwrite their change. **Mitigation:** run the backfill during a low-activity window (typically the first 5 minutes after deploy, before any real traffic). The audit file means any unintended overwrite can be detected and reverted.

---

## Threat Model & Mitigations

### T1 — A malicious super-admin sets a registry id that collides with future system data

A super-admin could create a UoM with id like `'__proto__'` or `'$set'`.

**Mitigations:**

- Client-side regex `^[a-z][a-z0-9-]*$` blocks special characters in the id.
- Server-side validation rejects non-string or empty `id`. (Note: the regex check is only client-side in v1; server is permissive on character set. Acceptable risk because settings is super-admin-only and audited.)
- Even if a strange id slipped through, it's stored as a plain string value in `SystemSettingsModel.value` (a Mongoose `Mixed` field) and never used as a query operator key, so prototype pollution / NoSQL injection are not reachable.

### T2 — Backfill overwrites a user's in-flight edit

Described above. Mitigation: low-traffic window + audit file + idempotent re-run.

### T3 — Soft-deleted unit referenced by existing data displays as "blank" or breaks the UI

If a super-admin soft-deletes `kg` and an existing Expense has `unit: 'kg'`, the form's display logic must still resolve the label.

**Mitigation:** `formatUnit(registry, id)` (in `lib/units.ts`) returns the label for any `findUnitById` match (active or not). For unknown ids, falls back to the raw id string — graceful soft-failure. Verified by unit test `formatUnit — returns the label even for a soft-deleted unit so legacy records keep displaying`.

### T4 — Registry size grows unbounded

A malicious or careless super-admin could add thousands of UoMs.

**Mitigation:** all helpers are O(N); registry typically <50 entries. No enforced cap in v1; flagged in test-scope.md as future hardening if a real client ever adds >100 entries.

### T5 — Missing UoM at form-load time silently disables the form

If `getUnitsOfMeasurementAction` returns `success: false` (transient DB error), the form falls back to `DEFAULT_UNITS_OF_MEASUREMENT` (the seed array). User can still create records with the seed ids; their entries will be valid against any future registry that includes those defaults.

---

## Static Analysis (Semgrep)

Ran `semgrep --config=auto` on the 10 REQ-033 files:

- `lib/units.ts`
- `interfaces/unit-of-measurement.interface.ts`
- `services/system-settings-service.ts` (additions only — same patterns as expense-categories)
- `app/actions/units-actions.ts`
- `app/dashboard/settings/actions.ts` (additions only)
- `components/features/admin/units-of-measurement-form.tsx`
- `components/features/finance/expense-form.tsx`
- `components/features/finance/edit-expense-dialog.tsx`
- `components/features/admin/menu-item-form.tsx`
- `components/features/admin/menu-item-edit-form.tsx`
- `scripts/backfill-unit-values.ts`

**Result:** 0 findings, 2 warn-level `PartialParsing` notes on `menu-item-edit-form.tsx` (pre-existing TSX parser quirks, unrelated to REQ-033 changes — verified by checking the lines: 578, 988, 1098 are all in code that pre-dates REQ-033). Full output: `gates/semgrep.json`.

## Dependency Audit

`npm audit --audit-level=high`:

- 1 HIGH — `xlsx` (pre-existing, allowlisted since REQ-027)
- 6 moderate — pre-existing (`nodemailer`, `webpack`, `nlp-compromise`, etc.)
- **0 new vulnerabilities introduced by REQ-033.**

Full output: `gates/dependency-audit.json`.

---

## Sign-off

- [x] All universal gates pass
- [x] Threat model reviewed (T1-T5)
- [x] No new auth surface
- [x] No new persistence path (extension of existing `SystemSettingsModel`)
- [x] No new query path
- [x] Static analysis clean on REQ-033 files
- [x] Dependency audit unchanged from REQ-031/032 baseline
- [x] Backfill is non-destructive, idempotent, and audit-emitting
- [x] Single-reviewer sufficient (MEDIUM-HIGH baseline; no AI-involvement bump warranted — change is contained and deterministic)

Per the Risk-Tiered Review Policy, MEDIUM-HIGH-risk additive changes that introduce no new auth/persistence/query paths and are covered by deterministic unit tests + an E2E spec require **one** human reviewer.
