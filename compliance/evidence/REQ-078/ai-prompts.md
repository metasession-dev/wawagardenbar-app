# REQ-078 — AI prompts + decision log

**Requirement ID:** REQ-078
**Risk:** LOW
**Date:** 2026-06-11

## Operator prompts (verbatim, in order)

| #   | Prompt                                                                                                                                                                                                                                                                                                 | Phase                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| 1   | _"i need to disable the cron job that re implements sales when items are out of stock from the chiller, how is the controlled, is that done in the dashboard somewhere"_                                                                                                                               | Triage                           |
| 2   | _"Quick env-var gate (~15 min REQ, 1 file) — small code change so startScheduledJobs() skips registering runInventoryReconciliationJob when process.env.DISABLE_INVENTORY_RECONCILIATION_JOB === 'true'. Set the var in Railway prod, redeploy. Reversible without code change after the gate ships."_ | Choose option 1                  |
| 3   | _"try again"_                                                                                                                                                                                                                                                                                          | Resume                           |
| 4   | _"what would be the steps to complete this process manually"_                                                                                                                                                                                                                                          | Phase 2/3 handover request       |
| 5   | _"#370 merged"_                                                                                                                                                                                                                                                                                        | Phase 2 → Phase 3 trigger        |
| 6   | _"drive it"_                                                                                                                                                                                                                                                                                           | Phase 3 delegation back to agent |

## Sub-skill invocation log

**None.** LOW risk + unit-only put this REQ on the SoT-alignment trio's `stage_1_min_risk_class: MEDIUM` skip path. `e2e-test-engineer` not invoked — no `e2e/**/*.spec.ts` files touched.

## Decision log

- **2026-06-11** — Agent surfaced 3 options after Explore agent confirmed `lib/scheduled-jobs.ts:135-136` was the registration site and no admin UI / SystemSettings key / env-var control existed. Operator chose **option 1 (env-var gate)** over option 2 (SystemSettings + admin UI, proper fix) for time-to-production. Option 3 (comment-out + redeploy) was rejected by the agent's own recommendation (no audit trail, no UI signal).
- **2026-06-11** — Agent classified the change as LOW risk + tracked-feature path. Skipped Stage-1 SoT-alignment sub-skills per `sdlc-config.json:risk_register_keeper.stage_1_min_risk_class: 'MEDIUM'`. Confirmed Phase 0 with the operator at the workflow-decision block in chat.
- **2026-06-11** — Agent chose strict literal `'true'` env-var match over a permissive parse to avoid silent gates on ambiguous values; documented the choice + pinned by AC2 unit cases for `'false'` + `'1'` + arbitrary.

## Framework attribution

This artefact uploads with `evidence_type=ai_prompts`. Per META-COMPLY's `framework-registry-auditor` v1 review, clause attribution is **orphan-by-design** in v1.

## Refs

- Implementation plan: [`implementation-plan.md`](./implementation-plan.md)
- AI involvement summary: [`ai-use-note.md`](./ai-use-note.md)
