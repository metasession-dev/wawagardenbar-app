# Test Plan — REQ-095

**Requirement:** REQ-095
**Risk Level:** HIGH
**GitHub Issue:** #603
**Date:** 2026-07-26

## Tests to add

- `__tests__/lib/business-date.test.ts` — selected business-date labels, adjacent labels, inclusive N-day windows, and cutoff boundaries.
- `__tests__/services/financial-report-service.business-day.test.ts` — range-service query bounds and legacy fallback.
- `e2e/critical/daily-report-date-ranges.spec.ts` — admin-visible Today, Yesterday, Last 7 Days, and custom-range behavior against seeded cutoff-spanning data.

## Tests to update

- Existing Daily Report E2E coverage, if present, to assert the displayed period label and not only page load.
- Export tests to assert the resolved period metadata.

## Tests to remove

- None.

## Functional mapping

| Acceptance criterion                                 | Test                                                                                |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Today/Yesterday are adjacent before and after cutoff | `business-date.test.ts`; `daily-report-date-ranges.spec.ts`                         |
| Last 7 Days is exactly seven business dates          | `business-date.test.ts`; `daily-report-date-ranges.spec.ts`                         |
| Custom ranges are inclusive                          | `financial-report-service.business-day.test.ts`; `daily-report-date-ranges.spec.ts` |
| Cutoff-spanning records are attributed correctly     | `financial-report-service.business-day.test.ts`; seeded E2E fixture                 |
| Legacy records remain included                       | `financial-report-service.business-day.test.ts`                                     |
| Export period matches on-screen report               | export unit test and targeted E2E verification                                      |

## Non-functional testing

- Security and access control: retain existing admin-only report authorization tests.
- Performance: verify the range query remains indexed on `businessDate` and does not add per-day database calls.
- Accessibility: retain existing report controls and labels; no new inaccessible control is introduced.

## Test data

Use the existing report admin fixture and deterministic paid records on both sides of the configured cutoff. Do not commit binary, JSON, or environment-specific evidence to git.
