# REQ-058 — Security summary

**Requirement ID:** REQ-058
**Risk class:** LOW
**Surface:** `lib/scheduled-jobs.ts` (new `runInstagramRewardsJob` helper + 2 new scheduler lines in `startScheduledJobs`); no service or model changes; no server-side wire-up changes (boot call at `server.ts:53` already exists).

## STRIDE assessment

| Category                | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No               | No new auth surface; job runs server-side from `server.ts` boot. No external trigger.                                                                                                                                                                                                                                                                                                                                                                                     |
| **T** — Tampering       | No               | No new write path. Existing `InstagramService` writes (`PointsTransaction` creation via `awardSocialPoints`) are unchanged.                                                                                                                                                                                                                                                                                                                                               |
| **R** — Repudiation     | No               | Existing `PointsTransaction` audit trail captures every award. REQ-058 adds the cron tick but the award path itself is untouched.                                                                                                                                                                                                                                                                                                                                         |
| **I** — Info disclosure | No               | No new data persisted. The job reads public IG Graph API data and writes to existing `PointsTransaction` rows.                                                                                                                                                                                                                                                                                                                                                            |
| **D** — DoS             | Low              | Hourly Graph API call could hit rate limits (~200/hr) if multiple Railway replicas tick simultaneously. Mitigation: single-replica today; `lib/scheduled-jobs.ts` header documents the single-instance assumption. If we scale to N>1, a future REQ should add leader election (per-instance lock in Mongo, or a dedicated cron service). The existing `processInstagramRewards` error handling will log rate-limit hits via `console.error` without crashing the server. |
| **E** — Elevation       | No               | No role/permission change. The scheduler runs at the same trust level as the rest of the server process.                                                                                                                                                                                                                                                                                                                                                                  |

## Threat model — scheduler lifecycle

The scheduler bootstraps at server boot (`server.ts:53` → `startScheduledJobs()`). REQ-058 hooks in the IG-rewards job alongside the REQ-048 reward-expiry job:

1. **Boot** — `server.ts` calls `startScheduledJobs()`. The `started` guard is set true so subsequent calls (hot-reload in dev, accidental double-import) are no-ops.
2. **+60s catch-up** — first `runInstagramRewardsJob` tick fires shortly after boot to handle any posts that landed while the server was restarting.
3. **+1h ongoing** — subsequent ticks every hour. Each tick calls `InstagramService.processInstagramRewards` which:
   - Loads active rules (`triggerType: 'social_instagram'`).
   - For each rule, fetches recent IG-Graph media for the rule's hashtag.
   - Matches `media.username` to a customer's `socialProfiles.instagram.handle` (case-insensitive collation).
   - Checks `hasProcessedPost(mediaId)` to dedupe (current naive description-regex; IG-4 will improve).
   - Awards points via `RewardsService.awardSocialPoints`.

Failure modes considered:

1. **Graph API down / rate-limited** — `getHashtagId` and `getRecentMedia` both have `try/catch` around `fetch`; errors log to `console.error` and return `null` / `[]` so the rule processor just skips that rule on this tick. The next tick (1h later) retries naturally.

2. **Network partition between server and Mongo** — `processInstagramRewards` would throw on the first `findOne`; `runInstagramRewardsJob`'s outer try/catch catches it and logs via `console.error`. Server keeps ticking.

3. **Hot-reload double-registration** — `started` boolean blocks; the 2-interval idempotency test in `__tests__/lib/scheduled-jobs.test.ts` is the load-bearing safety check.

4. **Multi-replica race** — if Railway scales to N>1 replicas, each runs the job. Awards are protected against double-grant by `hasProcessedPost(mediaId)` regex dedup (and IG-4's planned `InstagramPostCredit` model will make this race-safe at the DB layer). Today the risk is bounded by single-replica deployment.

5. **Long-running tick blocking the next** — `setInterval` queues a new tick every hour even if the previous one hasn't completed. With `processInstagramRewards` typically completing in seconds, overlap is unlikely. If we ever see overlap, a future REQ should add a per-job re-entry guard.

## Privacy / regulatory

- No new PII collected. Instagram handle was collected via REQ-057's profile form. Graph API data is public IG-tagged posts.
- The dedup mechanism (description-regex on `PointsTransaction`) is the only place the `media_id` is stored today. IG-4 will move it to a dedicated `InstagramPostCredit` model.

## Static analysis

`semgrep scan --severity=ERROR lib/scheduled-jobs.ts` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. No new packages introduced.

## Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- Multi-replica leader election → future REQ.
- Per-job re-entry guard (if tick N+1 fires before tick N completes) → future REQ.
- Replacing naive description-regex dedup with `InstagramPostCredit` model → IG-4.
- Cron scheduling configurability (run only at certain hours, weekday-only campaigns, etc.) → future REQ.
