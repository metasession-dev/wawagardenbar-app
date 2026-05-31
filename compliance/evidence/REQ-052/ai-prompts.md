# REQ-052 — AI prompts log

**Date:** 2026-05-31

## Session prompts (user → AI)

1. `#200/#201/#202/#159`
   - Triggered the e2e-test-engineer triage cycle that surfaced #202 as a
     PRODUCT bug (not a test bug, unlike #200/#201). Result: the open-tab
     partial-payment spec was deterministically failing because the DFR
     query couldn't see open tabs without `tab.businessDate`.

2. _(AI surfaced REQ-052 plan with acceptance criteria, technical
   approach, STRIDE table.)_

3. `Yes — proceed with REQ-052 as planned (Recommended)`
   - Plan approval. AI proceeded with TDD-first implementation.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills were invoked for REQ-052: the change is purely a
service-layer 3-LOC + 4 unit tests. The existing e2e regression test
(`daily-report-payments.spec.ts:partial payment on open tab`) already
exists and remains the load-bearing E2E gate — no new e2e author work
needed, so `e2e-test-engineer` was not invoked.

## Decision points

- Locked `tab.businessDate` on the first partial payment (vs every
  partial recomputing): the tab's "business day" is anchored to the
  first cash event. A multi-day open tab is rare (the operator
  workflow closes tabs at end-of-day); when it does happen the
  earliest-day attribution is the correct one.
- No DB migration: existing tabs that already accumulated partials
  without `businessDate` will get it set on their NEXT partial. If
  none arrives, they remain invisible to the DFR — but those are
  exactly the tabs that closed without ever reaching the DFR query's
  scope, so this is benign.

## Audit cross-refs

- Sibling fix to REQ-051 (DFR business-day-range): same surface, same
  query, different code path.
- The `tab-service.ts:880` pattern (in `closeTab`) was the direct model
  for the REQ-052 insert.
- Project memory `feedback_tests_before_push` honoured: red TDD pass
  before the implementation.
- Project memory `feedback_sdlc_impl_plan_review` honoured: MEDIUM-risk
  plan presented for review before any code.
