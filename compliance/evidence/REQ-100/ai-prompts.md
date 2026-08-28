# REQ-100 — AI prompts log

**Date:** 2026-08-27

## Session prompts (user → AI)

1. User investigation request against the UAT environment: "why is the kitchen showing total sales of 25,000 but the total kitchen category sales is actually 32,200 and all orders have been marked as paid" — this predates REQ-100 itself; the root cause was identified during that session and captured as GitHub issue #672, later split into standalone bugs #676 (this REQ) and #677.
2. `invoke sdlc-implementer on #676` — with the pre-investigated root cause and fix approach supplied directly (see the issue body and the invocation args), since the debugging work had already happened in the prior session.

## Internal AI prompts (orchestrator → sub-skills)

- `requirements-aligner` — "Align SRS for REQ-100 ... Populate the SRS-ID column for each AC against docs/SRS.md, proposing a new REQ-AREA-NNN stub if nothing existing covers the by-main-category report's revenue/cost aggregation semantics." Returned a match against existing `REQ-MENUMGT-006` with drift (the item names this function as its source but never documented the multi-price behaviour) rather than a new stub.
- `adr-author` — "Assess ADR-worthiness for REQ-100 ... Single file touched, no new dependency, no new database/cache/queue, no new external service, no pattern change spanning more than one file." Returned no-ADR verdict.
- `risk-register-keeper` — "Draft risk-register entries (if any) for REQ-100 ... Read-only reporting function, no auth/RBAC change, no new write path, no new data exposure." Returned one entry: R-023, covering the unaudited-elsewhere gap rather than deferring outright.

## Decision points

- Kept `price`/`costPerUnit` on the output as quantity-weighted averages (derived from the now-correct summed total) rather than removing them from the type, so no consumer (the report UI) needed to change — only the number now displayed is correct.
- Preferred each order line's own `subtotal` field over recomputing `price × quantity`, since `subtotal` is the schema's authoritative persisted charge — falls back to `price × quantity` only for the existing test fixtures, which predate `subtotal` being set on mocked items.
- Opened risk R-023 rather than deferring, because the same accumulation bug pattern in sibling functions (`generateDailyReport`, `generateReportForDateRange`) is a genuinely unverified, specific, follow-up-able concern — not a speculative risk.
