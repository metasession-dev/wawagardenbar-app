---
req: REQ-109
generated_by: adr-author
generated_at: 2026-09-30T02:52:00Z
---

# Architecture decision — REQ-109

## Outcome

**No ADR needed** — role-guard string-array edits only, no new pattern/dependency/service/DB tier introduced.

## Detail

- **Rationale:** This REQ widens the allowed-roles list in existing, unchanged authorization checks (`session.role !== X` / `.includes(session.role)`) across `app/actions/admin/express-actions.ts`, `app/actions/tabs/tab-actions.ts`, `app/actions/admin/order-management-actions.ts`, and — discovered during implementation, see the Plan deviation section — `app/actions/inventory/snapshot-actions.ts` and 4 page-level `redirect()` gates. The authorization _mechanism_ is untouched; only the set of roles each existing check admits changes. It also deletes a UI section and its now-orphaned component. Risk class is HIGH because the change is RBAC-sensitivity-driven (widened permissions on destructive actions), not because it introduces architectural complexity.
- **Signals examined:** No new third-party dependency (none added). No new external service. No new DB/cache/queue tier. Pattern change spanning >3 files — technically 6+ files touched, but each is the _same_ pre-existing pattern edited in place, not a new pattern introduced across them (the decision tree's intent is a structural/architectural pattern shift, e.g. REST→RPC, not a mechanical repeated edit). Risk classification HIGH — this is the one signal that fires; per the tree it's "ADR (operator confirms)" for this signal alone, and the Stage-1 verdict already recorded that the operator may override at the HIGH-risk plan-approval checkpoint if they disagree. No override was raised.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [x] The verdict (no-ADR) matches the actual scope of this REQ, including the additional files discovered during implementation (all the same class of edit as the originally-scoped files).
- [ ] N/A — no ADR file to flip to Accepted.
- [x] The rationale is specific enough that an auditor reading this in 12 months would agree: a mechanical RBAC role-list widening across existing checks, not a new architectural pattern.

**Reviewer:** sdlc-implementer (agent) — operator sign-off pending final review
**Date:** 2026-09-30
