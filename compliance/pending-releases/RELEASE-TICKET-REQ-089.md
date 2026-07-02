# Release Ticket — REQ-089

**Requirement:** REQ-089 — Admin order management: portion size selection, manual price override, per-item special instructions, stock validation
**Issue:** [#452](https://github.com/metasession-dev/wawagardenbar-app/issues/452)
**Risk class:** MEDIUM
**Integration PR:** [#454](https://github.com/metasession-dev/wawagardenbar-app/pull/454) (merged to develop)
**Status:** TESTED - PENDING SIGN-OFF

## Summary

Enhances admin order management with:

- Portion size selector (full/half/quarter) in Express Create Order and Edit Order Dialog
- Manual price override UI (staff-only, gated by `allowManualPriceOverride`)
- Per-line special instructions textarea in admin order flows
- Stock validation on add in `expressCreateOrderAction`
- Price override UI removed from customer cart (staff-only now)

## Acceptance criteria

| AC  | Description                                        | Status |
| --- | -------------------------------------------------- | ------ |
| AC1 | Portion picker in Express Create Order             | PASS   |
| AC2 | Portion selector in Edit Order Dialog              | PASS   |
| AC3 | Price override in Express Create Order             | PASS   |
| AC4 | Price override in Edit Order Dialog                | PASS   |
| AC5 | No price override in customer cart                 | PASS   |
| AC6 | Special instructions in Express Create Order       | PASS   |
| AC7 | Special instructions in Edit Order Dialog          | PASS   |
| AC8 | Stock validation server-side                       | PASS   |
| AC9 | Out-of-stock item disabled in Express Create Order | PASS   |

## Quality gates

| Gate                | Result                 |
| ------------------- | ---------------------- |
| TypeScript          | 0 errors               |
| Lint                | PASS                   |
| Unit tests (vitest) | 1276 passed, 4 skipped |
| SAST (semgrep)      | 0 new findings         |
| npm audit           | 0 high/critical        |
| E2E (playwright)    | 4 passed, 0 failures   |

## Evidence

- SRS alignment: `compliance/evidence/REQ-089/srs-alignment.md`
- Architecture decision: `compliance/evidence/REQ-089/architecture-decision.md` (No ADR needed)
- Risk assessment: `compliance/evidence/REQ-089/risk-assessment.md` (R-011 MITIGATED)
- Test execution summary: `compliance/evidence/REQ-089/test-execution-summary.md`
- Implementation plan: `compliance/evidence/REQ-089/implementation-plan.md`

## Verification

- [x] All unit tests pass
- [x] All E2E tests pass
- [x] All quality gates green
- [x] Integration PR merged to develop
- [x] SRS alignment artefact compiled
- [x] Architecture decision artefact compiled
- [x] Risk assessment artefact compiled
- [ ] UAT verification on Railway
- [ ] Release PR opened to main

## Sign-off

**Operator:** <operator-name>
**Date:** <YYYY-MM-DD>
