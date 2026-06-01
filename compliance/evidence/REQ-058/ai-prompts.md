# REQ-058 — AI prompts log

**Date:** 2026-06-01

## Session prompts (user → AI)

1. `IG-5 as REQ-058`
   - AI surveyed the precedent (`lib/scheduled-jobs.ts` REQ-048 pattern, `InstagramService.processInstagramRewards` no-caller state, `server.ts:53` boot wire-up) and presented the implementation plan with 5 ACs. LOW risk → no formal approval gate; proceeded with TDD.

2. `#240 merged`
   - Confirmation that the integration PR landed cleanly with `Release version: REQ-058` attribution. AI started assembling the Phase 3 evidence pack per `feedback_phase3_release_ticket_mandatory`.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills were invoked for REQ-058. The work is a single-file scheduler addition; no e2e author work needed (per the `project_e2e_targeted_until_117` policy AND per the scope justification — unit boundary at 5 cases covers the surface). `sdlc-implementer` ran end-to-end; `e2e-test-engineer` was not invoked.

## Decision points

- **Hourly cadence over 30-minute** — `setInterval(HOUR_MS)` matches the REQ-048 reward-expiry cadence and is conservative against the ~200/hr Graph API rate limit. `mentioned_media` only surfaces posts from the last 24h, so hourly comfortably catches new posts well before they roll out of the window. If we ever see backlog growth, the next REQ can move to 30-minute ticks.

- **Reuse the existing `started` boolean idempotency guard** — same guard now protects both jobs. The idempotency test changed from asserting `setInterval` called `1` time to `2` times on first call, still `2` on second (no stacking).

- **Catch-up `setTimeout(60s)` per job** — each job gets its own catch-up. They fire approximately together (both 60s after boot) and run independently; no interleaving concerns since the work is small and async.

- **Don't add per-job re-entry guard** — `setInterval` queues a new tick every hour even if the previous hasn't completed. With `processInstagramRewards` typically completing in seconds, overlap is unlikely. Documented in `security-summary.md` as a future concern; not load-bearing for v1.

- **Don't add credentials check in the scheduler** — `InstagramService.processInstagramRewards` already handles missing `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_BUSINESS_ACCOUNT_ID` by returning mock data. The scheduler should be dumb about environment state.

- **Don't change `server.ts`** — boot wire-up at `server.ts:53` already calls `startScheduledJobs()`. The new job rides along the existing call site. Zero server-side change.

- **Phase 3 BEFORE release PR (REQ-057 lesson applied)** — repeated the pattern from REQ-057 cycle: land release ticket + 7 evidence markdowns on develop BEFORE opening the release PR. Avoids REQ-056's "release PR opens with no reviewable release on portal" pitfall.

## Audit cross-refs

- Parent backlog: #117 (IG-5).
- Direct dependencies: REQ-048 (`lib/scheduled-jobs.ts` pattern + `server.ts:53` wire-up), REQ-057 (IG handle validation in place so the rewards processor will match real handles).
- Cycle artefacts: PR #240 (integration), PR #241 (Phase 3 evidence pack — about to open), upcoming release PR (develop → main), upcoming close-out PR.
- Project memory honoured: `feedback_sdlc_impl_plan_review`, `feedback_tests_before_push`, `feedback_wait_for_ci`, `feedback_single_pr_default`, `feedback_pr_title_req_brackets`, `feedback_no_delete_develop_on_release_merge`, `project_e2e_targeted_until_117`, `feedback_phase3_release_ticket_mandatory`.
- Unblocks future work: IG-3 (Graph API mention/tag polling enhancements — exercise on every tick), IG-4 (`InstagramPostCredit` ledger), IG-6 (admin campaign UI), IG-7 (customer progress card), IG-8 (WhatsApp award notification — blocked by WA-1).
