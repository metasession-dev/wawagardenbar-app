---
req: REQ-118
generated_by: risk-register-keeper
generated_at: 2026-11-05T12:00:00Z
---

# Risk assessment — REQ-118

## Summary

This REQ opened the following entry in `compliance/risk-register.md`. The operator signed off R-051 at plan approval on 2026-11-05.

| Risk  | Title                                                              | Status this cycle                                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R-051 | Support reply sent in the wrong mode or outside the 24-hour window | Controls landed (mode chosen server-side from the last inbound message; tested for both modes). OPEN until the live UAT round-trip, then MITIGATED. `support_reply` is PENDING Meta review in both environments |

## Framework cross-references

- SOC 2 CC7.2 (monitoring of delivery): R-051
- GDPR Art. 5(1)(f), Art. 32: R-051

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
