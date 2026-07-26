# Release Ticket: REQ-095 — Cutoff-aware Daily Summary date ranges

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-07-26
**Requirement ID:** REQ-095
**Risk Level:** HIGH
**Issue:** [#603](https://github.com/metasession-dev/wawagardenbar-app/issues/603)
**Implementation PR:** [#604](https://github.com/metasession-dev/wawagardenbar-app/pull/604)
**Develop merge:** `92bbbedeb1dd22448ef4adee29bceecfe2b3ee95`

## Summary

Daily Summary selections now use one explicit WAT business-date contract. Today and
Yesterday remain adjacent regardless of the current cutoff position, Last 7 Days is
exactly seven business dates, and custom ranges are inclusive. Modern records query
persisted `businessDate`; legacy records without it use cutoff-to-cutoff `paidAt`
fallback bounds.

## AI contributors

| Tool  | Version | Commits              | Date       |
| ----- | ------- | -------------------- | ---------- |
| Codex | GPT-5   | `a2f556c`, `b9caa56` | 2026-07-26 |

Prompt and review record: `compliance/evidence/REQ-095/ai-prompts.md`.

## Implementation details

- `lib/business-date.ts` — shared label and query-range helpers.
- `services/financial-report-service.ts` — modern and legacy query boundaries.
- `app/actions/reports/report-actions.ts` — server-side label resolution.
- `app/dashboard/reports/daily/daily-report-client.tsx` — explicit date-only selections.
- Tests and SRS/RTM evidence updated under REQ-095.

## Test evidence

| Test type                     | Passed |     Failed | Evidence                                                                                                       |
| ----------------------------- | -----: | ---------: | -------------------------------------------------------------------------------------------------------------- |
| Vitest                        |  1,304 |          0 | Quality Gates/local output                                                                                     |
| Focused business-date/service |     35 |          0 | REQ-095 tests                                                                                                  |
| Playwright E2E                |    182 |          0 | [Quality Gates run 30211223050](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/30211223050) |
| TypeScript/build/SAST/audit   |   PASS | 0 blocking | Quality Gates run                                                                                              |

## UAT gate

- UAT health and home smoke: PASS.
- Feature-specific UAT review: PENDING authorised dual-actor reviewer.
- Export period/totals review: PENDING authorised reviewer.

## Acceptance criteria

- [x] Today and Yesterday resolve adjacent business-date labels.
- [x] Last 7 Days resolves exactly seven business-date labels.
- [x] Custom ranges are inclusive.
- [x] Cutoff boundary and legacy fallback tests pass.
- [x] Automated CI gates pass.
- [ ] UAT feature-specific verification recorded.
- [ ] Human release approval recorded.

## Post-deploy actions

None. No schema migration or data backfill is required.

## Reviewer checklist

- [ ] Review implementation and REQ-095 evidence.
- [ ] On UAT, verify Today and Yesterday before/after cutoff semantics.
- [ ] Verify Last 7 Days is exactly seven business-date labels.
- [ ] Verify a custom range and export totals/period match the screen.
- [ ] Record Stage 4 UAT execution with an authorised reviewer identity.
- [ ] Approve only after all evidence and checks are complete.
