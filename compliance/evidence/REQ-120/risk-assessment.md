---
req: REQ-120
generated_by: risk-register-keeper
generated_at: 2026-11-10T22:10:00Z
---

# Risk assessment — REQ-120

## Summary

This REQ opened the following entries in `compliance/risk-register.md`:

| RISK  | Title                                                                 | Status this cycle                                                          | Residual L × I  |
| ----- | --------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- |
| R-056 | Order money path rewritten behind one service                         | OPEN (opened in this REQ; controls landed, awaiting UAT)                   | low × high      |
| R-057 | Customer tab removal leaves legacy open tabs                          | OPEN (staff settle them; operator lists open customer tabs before release) | medium × low    |
| R-058 | API-key binding breaks existing integrations or mis-attributes orders | OPEN (operator identifies integrations before release)                     | medium × medium |
| R-059 | Order origin migration mislabels orders                               | OPEN (migration to run on UAT then production)                             | low × low       |

## Framework cross-references

- ISO 27001 A.8.25, A.8.28 (secure development, secure coding), A.8.32 (change management) — R-056, R-059
- ISO 27001 A.5.15, A.8.2 (access control, privileged access) — R-058
- SOC 2 CC6.1 (logical access) — R-058
- SOC 2 CC8.1 (change management) — R-056, R-057, R-059

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
