# AI Use Note — REQ-050

**Requirement:** REQ-050 — Expense-restock stock-leak fix for `trackByLocation` inventory
**Date:** 2026-05-28
**Risk Level:** HIGH

## AI involvement

- **Model:** Claude Opus 4.7 (`claude-opus-4-7`), via Claude Code.
- **Operator:** dev@metasession.co (`ostendo-io`).
- **Skill:** `sdlc-implementer` (DevAudit-Installer v0.1.20+). Phase-0 Workflow Triage classified #175 from `fix:` title + `bug` label + body heuristics (inventory ledger correctness + user-reported revenue impact) as **tracked Bug-fix · HIGH** — same risk class as REQ-049. Plan-approval checkpoint at Phase 1 was the gate before any code.

## What AI did

- Diagnosed the user's UAT report (Orijin - Small showing 0 bottles despite a +48 restock) via code-walk: identified REQ-044's `applyOrderStockDelta` pattern as the precedent; located the parallel `updateOne $inc` calls in `expense-inventory-link-service.ts` (3 sites: apply, reverse, reversal-pass).
- Authored the Phase-1 implementation plan with HIGH-required sections (STRIDE threat model, four-eyes attestation slot, rollback plan). Scoped the reconciliation script into the same PR after operator chose A+C.
- Performed the manual UAT data repair (Orijin Main Store 0 → 48) via a temp tsx script during Phase 1 (operator-authorised this turn; UAT-only per `feedback_no_prod_db_touches`). Temp script not committed.
- Implemented the three code-path refactors + the new `applyExpenseStockDelta` helper + the reconciliation script.
- Updated 33 existing REQ-034 tests (29 `findById` mocks needed `save: vi.fn()` injected; 13 `updateOne` assertions rewritten to `save()` assertions via a small Python bulk-patch). Authored 17 new test cases (6 trackByLocation service-integration + 11 script pure-helper).
- Ran the local gates (`tsc`, `vitest`, `eslint`, `npm audit`) before commit.

## Operator review

- **Plan reviewed + approved at the Phase-1 HIGH-mandatory checkpoint.**
- One scope decision escalated during Phase 1 ("what about the broken UAT row?") — operator chose **A + C in parallel**: bundle the reconciliation script into REQ-050 (A) and apply a one-shot manual repair to Orijin now (C). Done.
- All commits authored with `Co-Authored-By: Claude Opus 4.7` per the AI-disclosure principle.

## Four-eyes posture (HIGH-required)

- **Submitter:** `@ostendo-io` (skill-trigger user).
- **UAT Reviewer:** TO-BE-NAMED at Phase 4 — per `approval.mode: dual_actor`, the portal-side approver MUST differ from the submitter for HIGH-risk releases. See § _Four-eyes attestation_ in `implementation-plan.md` for the control-gap-acceptance fallback if a second human reviewer isn't available (REQ-049 pattern).

## Compliance positioning (per `Test_Policy.md` § AI involvement)

AI involvement does not raise REQ-050 from HIGH (already HIGH). The Phase-1 plan-approval checkpoint + dual-actor four-eyes UAT review + Production approval together form the layered human-in-the-loop control the framework requires for AI-authored security-relevant changes.
