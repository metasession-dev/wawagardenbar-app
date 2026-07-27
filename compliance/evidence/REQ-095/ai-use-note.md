---
ai_contributors:
  - tool: 'Codex'
    version: 'GPT-5'
    session_id: 'current'
    date_range: '2026-07-26'
    commits: []
  - tool: 'Claude Code'
    version: 'claude-sonnet-5'
    session_id: 'current'
    date_range: '2026-07-26 to 2026-07-27'
    commits: []
---

# AI Use Record — REQ-095

**Planned AI use:** implementation, test generation, and review of date-boundary behavior.

**Risk impact:** The change is HIGH risk because it affects user-visible financial totals. Human review and independent CI verification are required before promotion.

**Review controls:** The implementation will preserve the existing database fallback, add deterministic boundary tests, and use the normal feature branch → `develop` → `main` workflow.

## 2026-07-27 addendum — Claude Code

**Directed work:** review the PR #604/#605 evidence state ahead of UAT sign-off;
write the Playwright coverage the implementation plan called for but the original
PR shipped without; identify and fix whatever the resulting test failures pointed
to.

**What that surfaced:** writing and running the coverage found three defects beyond
what PR #604/#605 claimed fixed (Today/Yesterday and initial-load not resolving
through the operational cutoff, Last 7 Days display/query mismatch, export period
dropping the range's end date) and one unrelated, pre-existing defect that blocked
verifying the others at all (`OrderService.generateOrderNumber()`'s race — see
implementation-plan.md's "Scope addition" section). All four are fixed and covered
by tests in this update.

**Verification decisions carried over from the original Codex session:** persisted
`businessDate` remains the authoritative modern-record selector; cutoff-to-cutoff
intervals remain legacy-only; unrelated date-only inventory/public-summary APIs
were not touched. **Additional decision:** the order-number fix is folded into
REQ-095 rather than tracked under a separate REQ, per explicit operator direction,
because it was found and fixed while verifying this REQ and blocked that
verification directly.

**Not done:** did not claim UAT feature verification (no authorised UAT
credentials available in this environment) and did not merge or self-approve
anything — this update is uncommitted, pending an independent reviewer per
`docs/issues/stage2-independent-review-not-enforced.md`.
