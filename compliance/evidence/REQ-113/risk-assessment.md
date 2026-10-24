---
req: REQ-113
generated_by: risk-register-keeper
generated_at: 2026-10-23T23:30:00Z
---

# Risk assessment — REQ-113

## Summary

This REQ opened, mitigated or accepted **no** entries in `compliance/risk-register.md`.

| RISK-NNN | Title | Status this cycle | Residual L × I |
| -------- | ----- | ----------------- | -------------- |
| —        | —     | —                 | —              |

**Classification:** LOW. Stage 1 skipped the register hook, because `stage_1_min_risk_class` is MEDIUM. The plan's §5 _Risk register entries_ carries:

> `@risk-deferred: LOW risk — admin-only, read-only feature with no personal data, payments, new dependency or new public endpoint; the threats above are covered by existing controls plus the action's own permission check, so nothing is register-worthy.`

## Threats considered (plan §5) and the tests that prove each mitigation

| Threat                                           | L × I     | Mitigation proved by                                                                                                                                       |
| ------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthorised user opens the print page           | low × low | E2E AC10 in `e2e/admin/menu-print.spec.ts` (a CSR user is redirected to `/dashboard/forbidden`)                                                            |
| Server action called directly                    | low × low | `__tests__/actions/admin/menu-print-actions.test.ts`: the no-session and missing-permission cases are refused before any query                             |
| NoSQL operator injection via `mainCategorySlugs` | low × low | the same action tests: non-string, empty, over-long and bad-pattern slugs are rejected by zod before the query                                             |
| Unbounded query / heavy PDF                      | low × low | the query is filtered and projected; the logo is downscaled to 600 px (`lib/menu-print/logo.ts`); PDFs are built in the admin's browser, not on the server |
| Stored XSS via item names                        | low × low | names render as React text children of SVG `<text>`; there is no `dangerouslySetInnerHTML` in `components/features/admin/menu-print/`                      |

**Residual risk accepted with the plan:** jsPDF's WinAnsi fonts drop non-Latin-1 glyphs in item names. This is a rendering limitation, not a security risk, and ADR-005 records it.

## Framework cross-references

There are no register entries to map. The threat review above serves ISO 27001 A.8.25 (secure development life cycle) for this REQ.

## Approval mode

`sdlc-config.json:approval.mode` is `dual_actor`, so the `solo_with_gap` control-gap check (Phase 4) doesn't apply.

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ. _(N/A — no entries; the `@risk-deferred` rationale is accepted.)_
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due). _(N/A — none open.)_

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
