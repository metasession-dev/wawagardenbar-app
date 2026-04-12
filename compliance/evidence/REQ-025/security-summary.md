# Security Summary — REQ-025

**Requirement:** Business day cutoff — `businessDate` field on orders/tabs with admin attribution checkbox
**Risk Level:** HIGH
**Date:** 2026-04-12
**Tested by:** William
**Commit:** 7492aaf (develop)

---

## Gate Results

| Gate                                              | Result  | Notes                                                                              |
| ------------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| TypeScript (`npx tsc --noEmit`)                   | ✅ PASS | 0 errors                                                                           |
| SAST (`semgrep --config auto`)                    | ✅ PASS | 0 new findings on REQ-025 files                                                    |
| Dependency audit (`npm audit --audit-level=high`) | ✅ PASS | next.js updated to 16.2.3 to patch GHSA-q4gf-8mx6-v5v3; xlsx pre-existing accepted |
| Unit tests (`npx vitest run`)                     | ✅ PASS | 249/249 tests pass (21 new for REQ-025)                                            |
| E2E tests (`npx playwright test`)                 | ✅ PASS | Registered in playwright.config.ts; CI green                                       |
| CI Pipeline                                       | ✅ PASS | Run #51 (ID 24301252401) — Quality Gates + Upload Evidence both green              |

---

## Security Testing

| Test                                                                  | Result  | Notes                                                                                                                          |
| --------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Access control: `businessDate` override only from admin/super-admin   | ✅ PASS | All actions gate on `requireAdmin()` / `requireSuperAdmin()` / iron-session role check before accepting `businessDate` param   |
| Audit logging: `businessDayCutoff` settings change produces audit log | ✅ PASS | `SystemSettingsService.updateBusinessDayCutoff` calls `AuditService.log()` with actor userId                                   |
| Input validation: cutoff time field accepts only valid HH:MM          | ✅ PASS | `updateBusinessDayCutoff` validates format and range (00:00–23:59); invalid values throw with error message                    |
| Error handling: unavailable cutoff falls back to `"15:00"`            | ✅ PASS | `getBusinessDayCutoff` returns `"15:00"` default if setting is missing; `deriveBusinessDate` falls back if cutoff is malformed |
| Customer-submitted `businessDate` ignored                             | ✅ PASS | No customer-facing API or action accepts `businessDate`; only admin server actions do                                          |
| Webhook `businessDate` auto-derived (no user input)                   | ✅ PASS | Monnify and Paystack webhooks derive from system time + cutoff setting; no external input                                      |

---

## Financial Accuracy

| Test                                               | Result  | Notes                                                                                                                      |
| -------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `businessDate` field on Order/Tab models indexed   | ✅ PASS | Confirmed in `order-model.ts` and `tab-model.ts`                                                                           |
| `FinancialReportService` queries by `businessDate` | ✅ PASS | All three methods (`generateDailySummary`, `generateDateRangeReport`, `aggregatePartialPayments`) use `businessDate` range |
| Public sales summary queries by `businessDate`     | ✅ PASS | `app/api/public/sales/summary/route.ts` updated                                                                            |
| Unit tests confirm attribution correctness         | ✅ PASS | `business-date-attribution.test.ts` — 7 tests verifying order/tab attributions                                             |
| Backfill script handles all historical records     | ✅ PASS | `scripts/backfill-business-dates.ts` — idempotent, handles orders and tabs                                                 |

---

## UAT Verification

- **Branch:** develop → Railway auto-deployed commit 54e8e49
- **URL:** https://wawagardenbar-app-uat.up.railway.app
- **Date:** 2026-04-12

| Check                                          | Result  | Notes                                                                                      |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| Settings page renders Business Day Cutoff card | ✅ PASS | Visible on /dashboard/settings                                                             |
| Daily financial report returns revenue         | ✅ PASS | After paidAt fallback fix; ₦1,258,750 visible                                              |
| Express close tab page loads                   | ✅ PASS | No errors                                                                                  |
| Admin payment dialogs load                     | ✅ PASS | No errors                                                                                  |
| Hotfix: paidAt fallback added                  | ✅      | Reports broken until fallback added (54e8e49) — pre-migration records have no businessDate |

**Note:** COGS showing ₦0.00 is a pre-existing unrelated bug (issue #54) — not introduced by REQ-025.

---

## Production Post-Deploy Verification — 2026-04-12

- PROD Health check (HTTP 200): ✅ PASS
- PROD Admin auth gate (/dashboard → 307 redirect): ✅ PASS
- PROD Content-Security-Policy: ✅ PASS
- PROD Strict-Transport-Security: ✅ PASS
- PROD X-Frame-Options (DENY): ✅ PASS
- PROD X-Content-Type-Options (nosniff): ✅ PASS
- PROD Post-deploy workflow (CI): ✅ PASS (run 24304544014)
- PROD URL: https://wawagardenbar-app-production-45c8.up.railway.app

---

## Residual Risks

- **None introduced by this change.** The `businessDate` field is additive; existing queries using `paidAt` are unaffected outside of report services. Backfill script must be run once on production database after deployment.
