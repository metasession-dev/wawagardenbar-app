---
req: REQ-113
generated_by: e2e-test-engineer
generated_at: 2026-10-23T22:03:51Z
e2e_required: true
spec_path: e2e/admin/menu-print.spec.ts
---

# E2E scope decision — REQ-113

## Outcome

**E2E required — covered.** REQ-113 adds a user-facing admin page (`/dashboard/menu/print`) and a toolbar button on `/dashboard/menu`, so the UI-facing acceptance criteria are proved end-to-end in a browser.

## Detail

- **`e2e_required`:** `true`
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/admin/menu-print.spec.ts` (regression tier; REQ-MENUMGT-011 is a _Should_).
- **ACs covered:** AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC14, AC17, AC18 — each tagged with `tagTest('REQ-113', …)` and captured with `evidenceShot` at the proving assertion. AC13, AC15, AC16, AC19 and AC20 are layout/theme properties with no separate UI surface; they are proved by the Vitest `layout`, `themes` and `render-pdf` tests.
- **Local results (2026-10-23):** focused run 9/9; after a hydration-timing fix found by the full regression run, 27/27 (9 tests × 3) on a cold dev server. Full regression: 537 passed, 13 failed — every failure triaged as unrelated to REQ-113 (missing payment-provider secrets locally, failures that also occur on `develop`, or load flakes that pass in isolation on both `develop` and this branch).

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
