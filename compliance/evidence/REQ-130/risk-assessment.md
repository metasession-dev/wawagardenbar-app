---
req: REQ-130
generated_by: risk-register-keeper
generated_at: 2026-11-27T13:07:30Z
---

# Risk assessment — REQ-130

## Summary

REQ-130 is LOW risk and opens, mitigates and accepts no entries in `compliance/risk-register.md`.

@risk-deferred: a role-filtered entry in the dashboard menu; access control stays in `app/dashboard/support/layout.tsx` and the support actions, and the menu uses the same role list. No new data path, dependency or secret. The negative cases (kitchen-only member and customer cannot see or open the page) are covered by `e2e/critical/dashboard-support-link.spec.ts` and `__tests__/components/dashboard-nav.test.ts`.

| Risk | Title | Status this cycle    | Residual L × I |
| ---- | ----- | -------------------- | -------------- |
| none | n/a   | deferred (see above) | n/a            |

## Framework cross-references

None (no register entries).

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
