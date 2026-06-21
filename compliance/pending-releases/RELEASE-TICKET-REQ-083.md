# Release Ticket: REQ-083 — Fix completed orders reverting to previous status

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-06-21
**Requirement ID:** REQ-083
**Risk Level:** MEDIUM
**PR:** [#405](https://github.com/metasession-dev/wawagardenbar-app/pull/405)

---

## Summary

Fixes #404 — completed/cancelled orders revert to their previous status on the kitchen display and order queue after staff marks them done. Root cause: socket payload missing top-level `status` field + `router.refresh()` race with MongoDB write.

## AI Involvement

- **AI Tool Used:** Cascade (Windsurf)
- **AI-Generated Files:** `lib/socket-emit-helper.ts` (modified), `components/features/kitchen/kitchen-order-grid.tsx` (modified), `components/features/admin/order-queue.tsx` (modified), `e2e/realtime/order-status-revert.spec.ts` (new)
- **Human Reviewer of AI Code:** William
- **Components Regenerated:** none

## Implementation Details

**Files Modified:**

- `lib/socket-emit-helper.ts` — add `status: updates?.status` to `emitOrderUpdatedEvent` payload
- `components/features/kitchen/kitchen-order-grid.tsx` — terminal statuses remove from store, non-terminal use `data.status ?? data.updates?.status` fallback, no more `router.refresh()` on terminal transitions
- `components/features/admin/order-queue.tsx` — add `subscribeToOrders` socket subscription for real-time status updates

**Dependencies Added/Changed:**

- No dependency changes

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                          |
| ---------------- | ----- | ------ | ------ | ------------------------------------------ |
| E2E (Playwright) | 4     | 4      | 0      | DevAudit portal: wawagardenbar-app/REQ-083 |
| Regression       | 6     | 6      | 0      | DevAudit portal: wawagardenbar-app/REQ-083 |

## Security Evidence

| Check            | Result          | Evidence Location                                      |
| ---------------- | --------------- | ------------------------------------------------------ |
| SAST             | 0 high/critical | DevAudit portal: wawagardenbar-app/REQ-083             |
| Dependency Audit | 0 high/critical | DevAudit portal: wawagardenbar-app/REQ-083             |
| Access Control   | N/A             | Git: `compliance/evidence/REQ-083/security-summary.md` |
| Audit Log        | PASS            | Git: `compliance/evidence/REQ-083/security-summary.md` |

## Acceptance Criteria

- [x] AC1 — completed order removed from kitchen display immediately
- [x] AC2 — non-terminal status updates in-place without revert
- [x] AC3 — `order:updated` socket payload carries top-level `status` field
- [x] AC4 — order queue receives socket status update in real-time
- [x] AC5 — cancelled order removed from kitchen display
- [x] All E2E tests passing
- [x] TypeScript clean
- [x] SAST clean
- [x] Dependencies clean
- [x] AI use documented

## Risk Assessment

- Minimal risk — additive change to socket payload; existing consumers reading `data.updates.status` continue to work unchanged
- No DB schema changes, no migration required
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
- [ ] AI code reviewed
- [ ] No hallucinated dependencies
- [ ] Post-deploy actions documented (none required)

---

## Audit Trail

| Date       | Action                   | Actor   | Notes                           |
| ---------- | ------------------------ | ------- | ------------------------------- |
| 2026-06-21 | Requirement created      | William | Risk: MEDIUM                    |
| 2026-06-21 | Implementation completed | Cascade | PR #405 → develop               |
| 2026-06-21 | AI code reviewed         | William | socket-emit-helper, grid, queue |
| 2026-06-21 | Tests passed             | CI      | E2E 4/4 + regression 6/6        |
| TBD        | UAT verification passed  | William | Pending Railway deploy          |
| TBD        | Submitted for review     | William | PR to main pending UAT          |
