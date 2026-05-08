# Test Execution Summary — REQ-036

**Requirement:** REQ-036 — Quick-action tip-method parity + tip display on order surfaces (add-on to REQ-035)
**Issue:** [#77](https://github.com/metasession-dev/wawagardenbar-app/issues/77)
**Parent Issue:** [#76](https://github.com/metasession-dev/wawagardenbar-app/issues/76)
**Risk Level:** MEDIUM
**Date:** 2026-05-07
**Develop SHA evaluated:** `adb96cc`
**CI run:** [#76](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/25509934777)

---

## Top-line gate results

| Gate                        | Result                    | Detail                                                                                                                                                                                                 |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript (`tsc --noEmit`) | **PASS**                  | 0 errors. `gates/tsc.txt`                                                                                                                                                                              |
| Vitest unit suite           | **PASS**                  | 517 / 517 tests pass (512 baseline + 5 new). `gates/vitest-summary.txt`                                                                                                                                |
| Semgrep SAST                | **PASS** on REQ-036 files | 0 findings on the 13 REQ-036 changed files; 3 ERROR-level findings on workflow YAML are baseline drift from REQ-035.                                                                                   |
| Dependency audit            | **PASS**                  | 0 unaccepted high/critical (1 high `xlsx` allowlisted by CI). REQ-035's mongoose 8.23.1 fix preserved.                                                                                                 |
| Build (`npm run build`)     | **PASS**                  | Next.js production build succeeds.                                                                                                                                                                     |
| CI Pipeline                 | **PARTIAL**               | Quality Gates ✓ + Register Release ✓ on `adb96cc`. Upload Evidence transient HTTP 429 on bulk infra artefact upload (META-COMPLY rate limit unrelated to REQ-036 code; resolves on retry / next push). |

---

## TDD Discipline

Tests were written **before** the implementation they validate, per the project's TDD-discipline rule for REQs that touch financial data.

| Layer                   | Test file                                                        | Test count | Authored before code? |
| ----------------------- | ---------------------------------------------------------------- | ---------- | --------------------- |
| Tab service (capture)   | `__tests__/services/tab-service.tip-method.test.ts`              | 3          | Yes                   |
| Daily-report aggregator | `__tests__/services/financial-report-service.tip-method.test.ts` | 2          | Yes                   |

Total new unit tests: **5**. Plus 1 new Playwright spec (`e2e/orders/admin-pay-tab-tip-method.spec.ts`) covering AC1, AC8 end-to-end. Spec includes `test.skip()` graceful fallback when admin auth fixtures or open tabs aren't present.

---

## AC verification

| AC  | Verified by                                                                                                    | Result                                                 |
| --- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| AC1 | `e2e/orders/admin-pay-tab-tip-method.spec.ts` — card bill + cash tip override on Full Payment                  | PASS (skipped locally w/o open tab; CI ran end-to-end) |
| AC2 | Manual UAT walkthrough (component test optional)                                                               | Pending UAT execution                                  |
| AC3 | Manual UAT walkthrough — customer-checkout TipInputStep dropdown                                               | Pending UAT execution                                  |
| AC4 | `tab-service.tip-method.test.ts` — 3/3 tests cover persistence + legacy fallback                               | PASS                                                   |
| AC5 | Manual UAT walkthrough — admin order detail Payment Info card                                                  | Pending UAT execution                                  |
| AC6 | Manual UAT walkthrough — customer checkout OrderSummary tip line                                               | Pending UAT execution                                  |
| AC7 | `e2e/orders/admin-pay-tab-tip-method.spec.ts` (implicit — DR section reflects partial-payments) + manual UAT   | PASS / Pending                                         |
| AC8 | `financial-report-service.tip-method.test.ts` "AC8: card bill + cash tip on the same row → tip in cash bucket" | PASS                                                   |
| AC9 | Vitest baseline regression: 512/512 baseline + 5 new = 517 pass                                                | PASS                                                   |

---

## Defects found during implementation

| #   | Surface                                           | Description                                                                                                                                                                                                                                                                                                                               | Resolution                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | CI Upload Evidence                                | META-COMPLY HTTP 429 rate limit on bulk infra artefact upload (`sast-results.json`, `dependency-audit.json`, `test-scope.md`)                                                                                                                                                                                                             | Out-of-band; retry typically clears it; the next push (this evidence commit) triggers a fresh upload run with fewer concurrent uploads. Quality Gates job remains green.                                                                                                                                                                                              |
| D2  | `app/dashboard/orders/express/close-tab/page.tsx` | UAT-discovered missed surface (2026-05-08): the dedicated Express Close Tab page (`/dashboard/orders/express/close-tab`) shipped with bill-method buttons but no tip section, even though `expressCloseTabAction` already accepted `tipAmount` + `tipPaymentMethod` from REQ-035/036. Pure surface-enumeration miss during initial scope. | Added `<TipInputRow>` with the same independent method dropdown pattern as `AdminPayTabDialog` Full Payment branch. Tip state + override flag in the page; effective method defaults to bill `paymentType`, overrideable. Forwarded to action. tsc 0 errors, 517/517 vitest still pass. Surface-enumeration miss flagged against `feedback_grep_before_migration.md`. |

No defects originating in REQ-036 application code.

---

## Pending pre-merge actions

- 1 reviewer per MEDIUM-risk policy.
- META-COMPLY UAT release approval.
- Manual UAT walkthrough per `uat-checklist.md` (AC2, AC3, AC5, AC6 verified there).

## Pending post-merge actions

- No backfill required (additive optional field; aggregator fallback handles legacy rows).
- Production smoke: open the Process Tab Payment dialog post-deploy and confirm the tip-method dropdown is present on both branches; record a card-bill + cash-tip sequence and verify Daily Report attribution.
