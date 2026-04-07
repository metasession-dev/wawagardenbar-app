# Release Ticket: REQ-023 — Replace Total Amount with Staff Pot Balance

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-04-07
**Requirement ID:** REQ-023
**Risk Level:** LOW
**PR:** #49

---

## Summary

Replaced the "Total Amount" card (showing cumulative tab revenue) on the Tabs Management page with a "Staff Pot Balance" card showing the current month's accumulated Staff Pot. Removes sensitive financial data from general admin view and motivates staff.

## Implementation Details

**Files Modified:**

- `app/dashboard/orders/tabs/page.tsx` — fetch Staff Pot balance via `getStaffPotDataAction()`, pass as prop
- `components/features/admin/tabs/dashboard-tabs-list-client.tsx` — replace Total Amount card with Staff Pot Balance card (PiggyBank icon, "This month" subtitle)
- `scripts/sync-prod-to-uat.sh` — fix DB name defaults, add `.env.local` support for external URIs
- `package-lock.json` — vite updated to fix 3 high-severity CVEs

**Dependencies Added/Changed:**

- vite updated (fix GHSA-4w7w-66w2-5vf9, GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583)

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                           |
| ---- | ---------------- | ------ | -------- | ------------------------------- |
| —    | None             | —      | —        | No post-deploy actions required |

## Audit Trail

| Date       | Action                   | Actor            | Notes                       |
| ---------- | ------------------------ | ---------------- | --------------------------- |
| 2026-04-06 | Requirement created      | Claude + William | Risk: LOW                   |
| 2026-04-07 | Implementation completed | Claude + William | Card swap + vite CVE fix    |
| 2026-04-07 | UAT verified             | William          | ₦16,360 displayed correctly |
| 2026-04-07 | Tests passed             | CI               | Run 24064646149             |
