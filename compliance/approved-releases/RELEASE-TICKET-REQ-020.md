# Release Ticket: REQ-020 — Restock Recommendation Strategies and CSV Export

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-04-01
**Requirement ID:** REQ-020
**Risk Level:** MEDIUM
**PR:** Included in next develop → main merge

---

## Summary

Extends the restock recommendations page with three strategy modes (Stock Urgency, Popularity, Profitability). Popularity and profitability modes include a diversity guarantee ensuring minimum 2 items per subcategory, with quantity adjustment for low-activity items. Adds CSV export for sharing recommendations with suppliers.

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** Service logic updates, client component updates, unit tests, E2E tests
- **Human Reviewer of AI Code:** Pending (MEDIUM risk)
- **Components Regenerated:** None

## Implementation Details

**Files Modified:**

- `services/restock-recommendation-service.ts` — strategy param, score field, diversity guarantee, quantity adjustment
- `app/actions/inventory/restock-recommendation-actions.ts` — strategy param passthrough
- `components/features/inventory/restock-recommendations-client.tsx` — strategy tabs, CSV export button

**Files Created:**

- `__tests__/inventory/restock-recommendation-strategies.test.ts` — 20 unit tests

**Dependencies Added/Changed:**

- No dependency changes

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                             |
| ---------------- | ----- | ------ | ------ | --------------------------------------------- |
| Unit (Vitest)    | 20    | 20     | 0      | META-COMPLY portal: wawagardenbar-app/REQ-020 |
| E2E (Playwright) | 3     | 3      | 0      | META-COMPLY portal: wawagardenbar-app/REQ-020 |

## Security Evidence

| Check            | Result          | Evidence Location                                      |
| ---------------- | --------------- | ------------------------------------------------------ |
| SAST             | 0 new findings  | META-COMPLY portal: wawagardenbar-app/REQ-020          |
| Dependency Audit | 0 high/critical | META-COMPLY portal: wawagardenbar-app/REQ-020          |
| Access Control   | PASS            | Git: `compliance/evidence/REQ-020/security-summary.md` |
| Audit Log        | N/A (read-only) | Git: `compliance/evidence/REQ-020/security-summary.md` |

## Acceptance Criteria

- [x] Strategy selector visible with three options: Stock Urgency, Popularity, Profitability
- [x] Stock Urgency mode behaviour unchanged from REQ-019
- [x] Popularity mode sorts items by sales velocity within groups
- [x] Popularity mode guarantees minimum 2 items per subcategory
- [x] Popularity mode adjusts reorder qty for low-sales items to minimum viable
- [x] Profitability mode sorts items by (sellingPrice - costPerUnit) \* avgDailySales
- [x] Profitability mode has same diversity guarantee and quantity adjustment
- [x] CSV export button visible in filter bar
- [x] CSV export contains correct columns including crate info
- [x] CSV filename follows pattern: restock-recommendations-{strategy}-{date}.csv
- [x] Export reflects current filters and strategy
- [x] All existing filters, summary cards, and table layout unchanged
- [x] AI use documented

## Risk Assessment

- No new endpoints — extends existing server action
- CSV export is client-side only (no server data exposure)
- No new dependencies

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

| Date       | Action                   | Actor  | Notes                             |
| ---------- | ------------------------ | ------ | --------------------------------- |
| 2026-04-01 | Requirement created      | Claude | Risk: MEDIUM                      |
| 2026-04-01 | Implementation completed | Claude | Strategy modes, CSV export, tests |
| 2026-04-01 | Tests passed             | Claude | 20 unit + 3 E2E, all gates green  |
