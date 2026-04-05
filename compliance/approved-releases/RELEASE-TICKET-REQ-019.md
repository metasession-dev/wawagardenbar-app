# Release Ticket: REQ-019 — Restock Recommendations Dashboard Page

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-04-01
**Requirement ID:** REQ-019
**Risk Level:** MEDIUM
**PR:** Included in next develop → main merge

---

## Summary

Adds a restock recommendations dashboard page at `/dashboard/inventory/restock-recommendations` for admins and super-admins. The page shows suggested restock quantities based on sales velocity and current stock levels, grouped by subcategory, with configurable filters for category, lookback period, price bracket, and priority.

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** Service logic, server actions, page component, client component, unit tests, E2E tests
- **Human Reviewer of AI Code:** Pending (MEDIUM risk)
- **Components Regenerated:** None

## Implementation Details

**Files Created:**

- `services/restock-recommendation-service.ts` — Bulk-optimised service (4 DB calls)
- `app/actions/inventory/restock-recommendation-actions.ts` — Server actions with auth
- `app/dashboard/inventory/restock-recommendations/page.tsx` — Page component
- `components/features/inventory/restock-recommendations-client.tsx` — Client with filters, cards, tables
- `__tests__/inventory/restock-recommendation.test.ts` — 25 unit tests
- `e2e/restock-recommendations.spec.ts` — 7 E2E tests

**Files Modified:**

- `app/dashboard/inventory/page.tsx` — Added "Restock Recommendations" link button
- `playwright.config.ts` — Added restock-recommendations test project

**Dependencies Added/Changed:**

- No dependency changes

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                             |
| ---------------- | ----- | ------ | ------ | --------------------------------------------- |
| Unit (Vitest)    | 25    | 25     | 0      | META-COMPLY portal: wawagardenbar-app/REQ-019 |
| E2E (Playwright) | 7     | 7      | 0      | META-COMPLY portal: wawagardenbar-app/REQ-019 |

## Security Evidence

| Check            | Result          | Evidence Location                                      |
| ---------------- | --------------- | ------------------------------------------------------ |
| SAST             | 0 new findings  | META-COMPLY portal: wawagardenbar-app/REQ-019          |
| Dependency Audit | 0 high/critical | META-COMPLY portal: wawagardenbar-app/REQ-019          |
| Access Control   | PASS            | Git: `compliance/evidence/REQ-019/security-summary.md` |
| Audit Log        | N/A (read-only) | Git: `compliance/evidence/REQ-019/security-summary.md` |

## Acceptance Criteria

- [x] Page renders at `/dashboard/inventory/restock-recommendations` for admin/super-admin
- [x] Unauthorized users are redirected
- [x] Food/Drinks filter shows only items matching selected mainCategory
- [x] Lookback period (7/14/30/60/90 days) changes the sales velocity calculation
- [x] Subcategory multi-select filters items by category
- [x] Price bracket filter narrows items by selling price
- [x] Priority filter shows only items matching selected priority level
- [x] Results grouped by subcategory with collapsible sections
- [x] Summary cards show total items, urgent/medium/low counts, and estimated restock cost
- [x] Table shows item name, current stock, unit, avg daily sales, days until stockout, suggested reorder qty, supplier, priority badge, last restock date
- [x] Urgent groups auto-expanded; others collapsed
- [x] Link button accessible from inventory page header
- [x] All E2E tests passing
- [x] TypeScript clean
- [x] SAST clean (no new findings)
- [x] Dependencies clean
- [x] AI use documented

## Risk Assessment

- Read-only feature — no data mutations, no new write endpoints
- No new dependencies added
- Access controlled by existing `inventoryManagement` permission

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                           |
| ---- | ---------------- | ------ | -------- | ------------------------------- |
| —    | None             | —      | —        | No post-deploy actions required |

---

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed (if applicable)
- [ ] No hallucinated dependencies
- [ ] Post-deploy actions documented (or confirmed none required)

---

## Audit Trail

| Date       | Action                   | Actor  | Notes                                 |
| ---------- | ------------------------ | ------ | ------------------------------------- |
| 2026-04-01 | Requirement created      | Claude | Risk: MEDIUM                          |
| 2026-04-01 | Implementation completed | Claude | Service, actions, page, client        |
| 2026-04-01 | Tests added              | Claude | 25 unit + 7 E2E (post-push deviation) |
| 2026-04-01 | Tests passed             | Claude | All gates green                       |
