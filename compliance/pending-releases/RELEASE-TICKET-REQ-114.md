# Release Ticket: REQ-114 — Upgrade zod 3 → 4 to clear GHSA-mrhx-c7xc-m3w5

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-10-23
**Requirement ID:** REQ-114
**Risk Level:** MEDIUM
**Issue:** [#956](https://github.com/metasession-dev/wawagardenbar-app/issues/956)
**Implementation branch:** `fix/956-zod-4-upgrade`
**Absorbed predecessor releases:** None

## Summary

`npm audit` began reporting a high advisory against zod on 2026-10-23, GHSA-mrhx-c7xc-m3w5 (_"Zod can exhaust memory while validating oversized constrained collections"_, every `zod <4.6.6`), which made CI's dependency-audit gate fail closed for every PR into `develop`. There is no patched 3.x, so this REQ upgrades `zod` 3.25.76 → 4.6.7 and `@hookform/resolvers` 3.10.0 → 5.9.2 (its 3.x supports zod 3 only). The operator chose fixing over risk-acceptance. The upgrade is behaviour-preserving: same accept/reject rules and the same error messages users see, verified against zod 3.25.76 itself.

## AI contributors

| Tool        | Version | Commits                                                                 | Date       |
| ----------- | ------- | ----------------------------------------------------------------------- | ---------- |
| Claude Code | —       | plan, formatting, migration and test commits on `fix/956-zod-4-upgrade` | 2026-10-23 |

## Implementation details

- `package.json` / `package-lock.json` — `zod` `^3.25.76` → `^4.6.7`; `@hookform/resolvers` `^3.10.0` → `^5.9.2`.
- `lib/zod.ts` (new) — the app's single zod entry point. Configures zod 4 (`z.config({ customError })`) to reproduce zod 3.25's default error wording, consulted only when a schema has no message of its own. All 40 files that used zod now `import { z } from '@/lib/zod'`.
- `lib/validation/zod-errors.ts` (new) — `requiredError(message)`, replacing v3's removed `required_error` in 12 places with identical semantics; one `errorMap` became zod 4's `error`.
- `app/actions/admin/reward-rules-actions.ts`, `app/actions/profile/profile-actions.ts` — `ZodError.errors` → `.issues` (5 sites).
- Five react-hook-form forms typed with the schema's input and output types (`useForm<z.input<…>, unknown, Output>`); `expense-categories-form.tsx` gains `?? []` on reads of fields the form always initialises.
- A separate `style:` commit applies the repo's pre-commit formatting to the touched files first, so the migration diff shows only real changes.
- **Known behaviour change:** zod 4's `z.number()` rejects `±Infinity`, which zod 3 accepted ("Number must be finite"). No number input can produce it; recorded in the plan's Plan deviation, and the operator chose to keep it strict (2026-10-23).
- SRS: trace-only to existing items; AC1/AC4 `@srs-deferred`. ADR: none (operator-confirmed "no ADR needed", 2026-10-23) (`compliance/evidence/REQ-114/architecture-decision.md`). Risk register: R-038, R-039 (OPEN; operator moves them to MITIGATED at review).

## Verification

- Dependency gate: `scripts/evaluate-npm-audit.sh` — `0 accepted, 0 unresolved` (before: GHSA-mrhx-c7xc-m3w5 unresolved).
- TypeScript: 0 errors. ESLint: 0 errors (999 pre-existing warnings, unchanged baseline).
- Unit/integration: 1584 passed, 4 skipped — includes 72 new tests (`__tests__/lib/zod4-migration.test.ts`, `__tests__/actions/zod4-action-errors.test.ts`).
- E2E: new `e2e/settings/zod-validation-messages.spec.ts` passed 3/3 (negative control fails without the compatibility map); full regression compared with `develop` — see `compliance/evidence/REQ-114/test-execution-summary.md`.
- Full detail: `compliance/evidence/REQ-114/test-execution-summary.md`, `compliance/evidence/REQ-114/security-summary.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. MEDIUM risk passed Phase 1 automatically (risk class and fix-not-accept route confirmed by the operator on 2026-10-23); the operator reviews the PR and performs the portal UAT review before Production approval.

## Bundled Changes

- **Core tracked release:** `REQ-114`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-114.json`
- **Manifest hash:** `sha256:58e42bdb32a4708e6af3db792e998124a984e1ebad6982b2379953f9f8459588`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** Explicit predecessor release tickets and non-release work are consolidated under approval envelope `REQ-114`.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes the core tracked release plus the explicit predecessor releases and non-release work listed below.
- **Security / risk impact:** No additional security/risk impact identified automatically; reviewer must confirm in the canonical release artifacts.
- **Reference:** commit range `origin/main..HEAD`

### Explicit Constituent Releases

- None

### Absorbed Non-Release Work

- `ff2171b` chore: sync SDLC templates from DevAudit
- `208f3da` chore(deps): bump next to 16.4.2 and dompurify to 3.4.17 (audit gate)
- `4ee226e` chore: ignore playwright-report-shard-\* artifacts
- `055ddb4` docs(compliance): close out REQ-112 (+ REQ-111) — sync main + reconcile (RELEASED)
