---
req: REQ-101
generated_by: sdlc-implementer
generated_at: 2026-09-04T11:00:00Z
---

# E2E scope decision — REQ-101

## Decision

`e2e_required: false`

## Rationale

No UI-facing files (`app/**/*.tsx`, `components/**/*.tsx`, or JSX equivalents)
are touched by this REQ's diff. The fix is confined to
`services/financial-report-service.ts`'s data aggregation
(`aggregateItemsIntoCategories` and `generateMainCategoryReport`). The Revenue
and Costs tab components already render whatever rows the service returns —
this REQ changes row _count and shape_ (two rows instead of one for
mixed-portion items), fully exercised by unit tests against the service's
public methods (`generateDailySummary`, `generateDateRangeReport`,
`generateMainCategoryReport`). No new UI behaviour is introduced that
requires browser-level verification.

## spec_path

null
