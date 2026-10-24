---
req: REQ-115
generated_by: risk-register-keeper
generated_at: 2026-10-24T16:41:34Z
---

# Risk assessment — REQ-115

## Summary

This REQ opened the following entries in `compliance/risk-register.md` (the register uses `R-NNN` IDs):

| Risk  | Title                                                            | Status this cycle                                                                                                                                    | Residual L × I            |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| R-040 | Weak customer sign-in PIN: 4 digits from a non-cryptographic RNG | OPEN, mitigated in code (6-digit `crypto.randomInt` PINs); per-phone attempt limiting is WA-04 (#966)                                                | low × high until WA-04    |
| R-041 | Phone normalisation collides or mis-matches accounts             | OPEN, controls landed (no-merge migration, dry-run default, before/after file, legacy-form lookups); closes after the UAT dry-run report is reviewed | low × medium              |
| R-042 | WhatsApp access token present in git history                     | OPEN until the operator confirms rotation (AC8)                                                                                                      | low × medium once revoked |

R-040 and R-041 move to MITIGATED only once the operator confirms the live UAT sign-in (AC15) and the migration dry-run review. R-042 closes on token rotation. None of the three is marked MITIGATED yet.

## Framework cross-references

- ISO 27001 A.8.5 (secure authentication), A.8.25, A.5.15, A.5.17, A.8.24: R-040, R-041, R-042
- SOC 2 CC6.1: R-040, R-042
- GDPR Art. 5(1)(d) accuracy: R-041

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence.
- [ ] OPEN entries have follow-up tracking (R-040: #966; R-041: migration run after UAT; R-042: token rotation).

**Reviewer:** REPLACE — operator name
**Date:** REPLACE — YYYY-MM-DD
