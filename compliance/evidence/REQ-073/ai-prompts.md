# REQ-073 — AI prompts captured

## Cycle entry

Operator: "#302 merged" then (after fork-in-the-road question): "Pick up #296 (admin destructive ops)"

Context: PR #302 (REQ-072, sub-issue #295) had merged to develop. Assistant flagged a genuine release-cadence fork — develop now had 4 unreleased REQs ready to bundle. Operator chose to continue building rather than ship.

## V1 scope decision

Operator approved the V1 plan: ship 3 specs (menu-delete + menu-duplicate + kitchen-void-batch); defer 5 (tab-delete + force-password-change + data-deletion-request + soft-delete-enforcement + kitchen-ingredient-archive).

Rationale:

- 3 ship-able with V1's Mongo-driver + service-layer pattern (no UI required, well-defined storage-layer behavior).
- 5 deferred for either (a) multi-collection complexity beyond V1 budget (tab-delete, data-deletion-request), (b) UI-driven flows that need browser context (force-password-change, soft-delete-enforcement), or (c) lower urgency given the V1 already covers the kitchen production lifecycle's void path (kitchen-ingredient-archive).

## In-cycle decisions

**Decision 1**: Mirror REQ-070's service-layer + Mongo-driver pattern rather than driving server actions.

Reason: Server actions in Next.js can't be invoked from the Playwright runner without complex Next.js Server Action POST scaffolding. REQ-070 established a clean pattern: import the service-layer + Mongo driver, seed state directly, call the service, assert via Mongo driver. Reusing this pattern keeps the spec footprint small + matches existing test infrastructure.

Trade-off: V1 pins **storage-layer correctness** but NOT action-layer auth wrapping (session-cookie validation + `requireRole(['admin','super-admin'])`). Action auth is covered by separate action-level unit tests; explicitly out of scope for V1 E2E. Documented honestly in `test-execution-summary.md` § "What this run does NOT prove".

**Decision 2**: Spec 1 + Spec 2 replicate the action's storage logic inline instead of invoking the action.

Reason: Both `deleteMenuItemAction` and `duplicateMenuItemAction` wrap their storage operations in session-cookie auth (`getIronSession`) which fails outside of a Next.js request context. The specs replicate the action's storage logic verbatim (action lines 594 for delete; 891-909 for duplicate) — this pins the same DB-level outcome. Action wrapping coverage is the responsibility of action-unit-tests, not E2E.

**Decision 3**: Spec 3 uses `ProductionService.voidBatch` directly (imported statically).

Reason: `ProductionService.voidBatch` is a pure service-layer function that operates on mongoose models. It IS reachable from the Playwright runner without going through Next.js request context. Verified during the audit — it depends only on `connectDB()` + Mongoose models, both of which work in the runner. This gives Spec 3 a deeper assertion (the full reversal orchestration, not just the storage primitives).

**Decision 4**: Seed a real `role: 'super-admin'` user to satisfy `voidBatch`'s `voidedByRole === 'super-admin'` precondition.

Reason: `voidBatch` validates `input.voidedByRole === 'super-admin'` at line 308 + uses `input.voidedBy` as a real ObjectId for `production.voidedBy` (FK). The seed creates a `users` document with the spec-prefix identifier + tears it down in `afterAll`. Honest disclosure in `security-summary.md` § "ephemeral super-admin user" with mitigations.

## Decisions NOT made by AI

- V1 scope (3 vs 8 specs): assistant proposed; operator approved with "proceed".
- Order of next sub-issues to pick up: operator's call.
- Whether to defer kitchen-ingredient-archive (similar pattern to void-batch): assistant's call, scoped to keep V1 budget tight.

## AI tool

- **Tool:** Claude Opus 4.7 via Claude Code (CLI).
- **Scope:** 3 spec files + 6-doc evidence pack + release ticket + RTM row + implementation plan.
- **Verification:** live E2E run against UAT (7/7 pass, 19.7s); tsc 0 errors; vitest 1129 pass (unchanged baseline).
