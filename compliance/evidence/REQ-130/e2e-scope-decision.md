---
req: REQ-130
generated_by: e2e-test-engineer
generated_at: 2026-11-27T12:30:00Z
e2e_required: true
spec_path: e2e/critical/dashboard-support-link.spec.ts
---

# E2E scope decision — REQ-130

## Outcome

**E2E required — covered.** The change is a role-filtered dashboard menu entry, which only a rendered session can prove, so it has a critical-tier spec using real throwaway staff logins. The gate passed locally against an isolated stack.

## Detail

- **`e2e_required`:** true.
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/critical/dashboard-support-link.spec.ts`.
- **ACs covered:** AC1 (csr, manager, admin and super-admin see Support and it opens `/dashboard/support`), AC2 (a kitchen-only member does not see it and is refused; a customer cannot open the page), AC3 (highlighted on the queue and on a ticket page), AC4 (visible for csr, absent for kitchen-only, side by side).
- **Regression sweep:** the existing specs that assert dashboard menu contents (`staff-multi-role`, `csr-uat`) only check named items and are unaffected by the two new entries.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

- [ ] The verdict matches the actual scope of this REQ's diff.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
