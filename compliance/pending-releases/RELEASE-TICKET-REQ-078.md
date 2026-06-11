# Release Ticket: REQ-078 — Env-var kill-switch for the inventory reconciliation job

**Status:** RELEASED
**Date:** 2026-06-11
**Requirement ID:** REQ-078
**Risk Level:** LOW
**GitHub Issue:** _(operator request via chat, no GH issue)_
**Integration PR:** [#370 (feat/REQ-078-reconciliation-kill-switch → develop)](https://github.com/metasession-dev/wawagardenbar-app/pull/370) — merged 2026-06-11 (`3803aa8`)
**Phase 3 Evidence PR:** [#371 (compliance/REQ-078-evidence-pack → develop)](https://github.com/metasession-dev/wawagardenbar-app/pull/371) — merged 2026-06-11 (`6222657`)
**Release PR:** [#372 (develop → main)](https://github.com/metasession-dev/wawagardenbar-app/pull/372) — merged 2026-06-11 14:41:16Z (`cdc454a`). Title `release: inventory reconciliation kill-switch [REQ-078]` per `feedback_pr_title_req_brackets` for `derive-release-version.sh` attribution. REQ-077 close-out (#369) rode along on the same release.
**Sign-off (dual-actor):** Portal UAT approved + Production approved + Marked as Released. Per `solo_with_gap` framework reading: the AI-tooling actor (sdlc-implementer) and the human operator (portal approver) are distinct actors; this satisfies the four-eyes contract on a one-person team.
**DevAudit Release:** [`devaudit.ai/projects/wgb/releases/REQ-078`](https://devaudit.ai/projects/wgb/releases/REQ-078) — release version `REQ-078`, status `released`.

**Post-deploy verification:** Post-Deploy Production Evidence SUCCESS ([run 27354933845](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/27354933845), 26s). Full E2E Regression on `main` SUCCESS — 489 tests passed, 22m45s ([run 27354933866](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/27354933866)). Production live on Railway via `main`. DevAudit Release Approval check needed one retrigger (initial run fired before portal-approve, status was `draft`) — same pattern as REQ-077.

---

## Summary

`lib/scheduled-jobs.ts` `startScheduledJobs()` gains a guard around the `setTimeout` + `setInterval` registration for `runInventoryReconciliationJob`. When `process.env.DISABLE_INVENTORY_RECONCILIATION_JOB === 'true'` the job is not registered, and the boot log line reads `[scheduled-jobs] started (..., inventory-reconcile: DISABLED)`.

REQ-048 reward-expiry and REQ-058 instagram-rewards jobs are unaffected — only the inventory reconciliation pair is gated. Strict literal `'true'` match — common ambiguous values (`'false'`, `'1'`, `'0'`, `''`) do not gate. Fail-safe: env var unset = current behaviour.

- **AC1** — `env=true` → inventory-reconcile NOT registered (reward + IG unaffected)
- **AC2** — env unset / `'false'` / `'1'` / arbitrary → registers as today (default unchanged)
- **AC3** — Boot log line reflects gate decision (`inventory-reconcile: 15min` vs `DISABLED`)
- **AC4** — Gate only affects inventory-reconcile; reward + IG keep their schedule

## Why ship this REQ

Operator needs to disable the 15-min auto-retry on production (e.g. during a sale-point inventory reconciliation where they're manually triaging which orders should deduct vs which should stay flagged) without a code-edit + redeploy cycle. The in-code comment at `lib/scheduled-jobs.ts:23-26` already anticipated this gap. Full SystemSettings + admin UI promotion is REQ-sized — this is the 1-file operational stopgap.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI)
- **Sub-skills invoked:** None. LOW risk + unit-only put this REQ on the SoT-alignment trio's `stage_1_min_risk_class: MEDIUM` skip path. `e2e-test-engineer` not invoked — no `e2e/**/*.spec.ts` files touched.
- **Operator action this cycle:** confirmed Phase 0 triage, reviewed + merged PR #370.

## Evidence pack

- [`implementation-plan.md`](../evidence/REQ-078/implementation-plan.md) — Phase 1 plan (ISO 29119 §3.4 / ISO 27001 A.8.25 + N/A callouts for GDPR Art. 25 + EU AI Act Art. 11)
- [`test-plan.md`](../evidence/REQ-078/test-plan.md) — AC → test mapping (7 vitest cases)
- [`test-scope.md`](../evidence/REQ-078/test-scope.md) — in-scope / out-of-scope / SRS items covered (none — operational toggle)
- [`test-execution-summary.md`](../evidence/REQ-078/test-execution-summary.md) — gate results + test-design record (devaudit#50)
- [`security-summary.md`](../evidence/REQ-078/security-summary.md) — STRIDE table + dependency audit + SAST notes
- [`ai-use-note.md`](../evidence/REQ-078/ai-use-note.md) — AI involvement + honest limitations
- [`ai-prompts.md`](../evidence/REQ-078/ai-prompts.md) — operator prompts + decision log

**Note:** SoT-alignment Tier 3 artefacts (`srs-alignment.md`, `architecture-decision.md`, `risk-assessment.md`) are not authored for this REQ — `sdlc-config.json:risk_register_keeper.stage_1_min_risk_class: 'MEDIUM'` and parity on the other two sub-skills mean LOW REQs skip the trio. The decision is recorded in [`ai-use-note.md`](../evidence/REQ-078/ai-use-note.md) and in this ticket's _AI Involvement_ section.

## Risk register entries

**None.** Fail-safe by design: env var unset preserves the current REQ-066 behaviour. Mis-configuration (operator forgets to unset after triage) results in stuck `inventory_deduction_failed` incidents that already have the manual `<IncidentRetryButton>` remediation from REQ-066 AC10 + visibility via REQ-077's expandable details panel. No data loss, no correctness regression.

## SRS items added

**None.** Operational lever, not user-observable behaviour change. Annotated `@srs-deferred: operational-toggle` for a future SystemSettings + admin UI promotion REQ.

## Out of scope

| Item                                                                       | Why deferred                                                                                                                                                         |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SystemSettings field for `STALE_PAID_ORDER_THRESHOLD_HOURS`                | Separate operational knob; doesn't share the gate this REQ adds.                                                                                                     |
| Admin UI toggle at `/dashboard/settings/jobs`                              | Heavier scope — SystemSettings model + permission gate + UI + e2e. Separate REQ when not urgent.                                                                     |
| Gating `scanStalePaidOrders` separately                                    | Both passes share the registration; disabling the job disables both. Stale-paid scan is read-only (IncidentEvent rows only) so leaving it off during triage is fine. |
| Gating `runRewardExpiryJob` (REQ-048) + `runInstagramRewardsJob` (REQ-058) | Out of REQ-078 scope. Each would be its own operational lever if needed.                                                                                             |

## Quality Gates

| Gate                                                     | Expected   | Actual (2026-06-11)                                                                               |
| -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`                                       | exit 0     | exit 0                                                                                            |
| `npx vitest run __tests__/lib/scheduled-jobs.test.ts`    | 0 failures | 11 pass / 0 fail (existing 4 + 7 new REQ-078 cases)                                               |
| `npx vitest run` (full)                                  | 0 failures | 1232 pass / 4 skip / 0 fail (+6 cases vs REQ-077 close-out baseline of 1226)                      |
| CI Pipeline on develop post-#370 merge                   | green      | _to be filled when the CI run for the integration-PR merge finishes_                              |
| Compliance Evidence Upload on develop post-this-PR merge | green      | _to be filled when this Phase 3 PR merges_                                                        |
| E2E Regression (critical tier) — release PR              | green      | _to be filled when CI on the release PR runs — no e2e specs added this REQ; gate must still pass_ |

## Stage Approvals

- [x] Stage 1 — Plan (operator confirmed Phase 0 "proceed" at the workflow-decision block)
- [x] Stage 2 — Implement + unit-test (1232/4/0; tsc clean; 7 new cases) — landed via PR #370
- [x] Stage 3 — Compile evidence — landed via PR #371
- [x] Stage 4 — Submit for UAT review — PR #372 opened + portal UAT approved
- [x] Stage 5 — Production deployment + Production-approve + Mark as Released (2026-06-11) + close-out (this PR)

## Notes

- Single-REQ tracked release path — NOT a housekeeping bundle.
- PR title MUST carry `[REQ-078]` brackets per `feedback_pr_title_req_brackets` so `derive-release-version.sh` attributes evidence to the right release.
- The `feedback_phase3_release_ticket_mandatory` memory applies: this release ticket + 6 evidence markdowns land on develop BEFORE the release PR is opened (this commit + the Phase 4 release PR are separate hops).
- Operator-facing post-release path (Railway):
  1. Set `DISABLE_INVENTORY_RECONCILIATION_JOB=true` in the Railway production env-vars panel
  2. Restart the service (or wait for Railway's auto-restart on env-var change)
  3. Confirm the Railway log stream shows `[scheduled-jobs] started (..., inventory-reconcile: DISABLED)` on the next boot
  4. To re-enable later: remove the variable (or set to anything ≠ `'true'`) + restart
