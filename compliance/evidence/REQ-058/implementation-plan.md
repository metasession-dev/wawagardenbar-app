# REQ-058 — Schedule InstagramService.processInstagramRewards

**Requirement ID:** REQ-058
**Risk Level:** LOW
**GitHub Issue:** [#117 IG-5](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Context

`services/instagram-service.ts:InstagramService.processInstagramRewards()` exists but has no caller — same shape as the REQ-048 (#117 P0 #3) reward-expiry gap that landed `lib/scheduled-jobs.ts`. Until something ticks it, no IG campaign points get awarded automatically; an operator would have to run the function manually.

REQ-048 already established the in-process scheduler pattern: persistent Railway server, single-instance assumption, hourly `setInterval` with a 60s catch-up `setTimeout`, errors swallowed so a tick can't crash the server, idempotent jobs. The file's header even calls out IG-5 as a future hook: _"This module is the registry future scheduled jobs hook into (e.g. the Instagram campaign poller, #117 IG-5)."_

REQ-058 extends the registry with `runInstagramRewardsJob()` and hooks it into the existing `startScheduledJobs()` bootstrap. `server.ts:53` already calls `startScheduledJobs()` so no server-side wire-up changes.

Dedup is already handled inside `InstagramService.processRule()` via `hasProcessedPost(mediaId)` (naive regex match on `PointsTransaction.description`). IG-4 (future REQ) will replace this with a proper `InstagramPostCredit` model. For REQ-058 the existing dedup is enough to keep hourly re-fetch idempotent.

## Acceptance criteria

1. **AC1 — `runInstagramRewardsJob()` helper** — new exported function in `lib/scheduled-jobs.ts` that wraps `InstagramService.processInstagramRewards()` in try/catch, logs failures via `console.error`, and returns `void`. Failures NEVER re-throw — a scheduled tick must not crash the server (same posture as `runRewardExpiryJob`).

2. **AC2 — Hourly schedule + catch-up via `startScheduledJobs()`** — extend the existing bootstrap to also `setTimeout(60s, runInstagramRewardsJob)` and `setInterval(1h, runInstagramRewardsJob)`. The existing `started` boolean guard prevents double-registration on hot-reload. Console message updated to reflect both jobs.

3. **AC3 — `server.ts` unchanged** — boot wire-up is already in place at `server.ts:53` (`startScheduledJobs()`). No server-side change.

4. **AC4 — Graceful-no-credentials path preserved** — `InstagramService.processInstagramRewards` already handles missing `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_BUSINESS_ACCOUNT_ID` by returning mock data (`mock_hashtag_id` + one synthetic post). REQ-058 doesn't add a credentials check; the scheduler is dumb about environment state.

5. **AC5 — Tests extend existing file** — `__tests__/lib/scheduled-jobs.test.ts` is the home for both REQ-048 and REQ-058 cases. New cases:
   - `runInstagramRewardsJob` calls `InstagramService.processInstagramRewards` once.
   - Errors are swallowed; tick doesn't throw; `console.error` called.
   - `startScheduledJobs()` registers **two** intervals (was 1 before); still idempotent on second call (no stacking; count stays at 2).

## Technical approach

### 1. `lib/scheduled-jobs.ts` (~20 LOC added)

```diff
+import { InstagramService } from '@/services/instagram-service';

 /**
  * Expire rewards whose `expiresAt` has passed. …
  */
 export async function runRewardExpiryJob(): Promise<number> { ... }

+/**
+ * Process Instagram-campaign post credits and award points. Wraps
+ * `InstagramService.processInstagramRewards` with the same
+ * error-swallowing posture as `runRewardExpiryJob`: a failure must
+ * not crash the server tick. Idempotent — `InstagramService.processRule`
+ * dedupes posts via `hasProcessedPost(mediaId)` against the
+ * `PointsTransaction` description field. IG-4 will replace that dedup
+ * with a proper `InstagramPostCredit` model.
+ */
+export async function runInstagramRewardsJob(): Promise<void> {
+  try {
+    await InstagramService.processInstagramRewards();
+  } catch (error) {
+    console.error(
+      '[scheduled-jobs] instagram-rewards job failed:',
+      error
+    );
+  }
+}

 export function startScheduledJobs(): void {
   if (started) return;
   started = true;

   // Reward expiry — REQ-048 (#117 P0 #3)
   setTimeout(() => void runRewardExpiryJob(), INITIAL_DELAY_MS);
   setInterval(() => void runRewardExpiryJob(), HOUR_MS);

+  // Instagram rewards — REQ-058 (#117 IG-5)
+  setTimeout(() => void runInstagramRewardsJob(), INITIAL_DELAY_MS);
+  setInterval(() => void runInstagramRewardsJob(), HOUR_MS);

-  console.warn('[scheduled-jobs] started (reward-expiry: hourly)');
+  console.warn(
+    '[scheduled-jobs] started (reward-expiry: hourly, instagram-rewards: hourly)'
+  );
 }
```

### 2. `__tests__/lib/scheduled-jobs.test.ts` (extend, +3 cases)

```ts
const mockProcessIG = vi.fn();
vi.mock('@/services/instagram-service', () => ({
  InstagramService: { processInstagramRewards: () => mockProcessIG() },
}));

describe('REQ-058: runInstagramRewardsJob', () => {
  it('calls processInstagramRewards', async () => { ... });
  it('swallows errors and does not throw (a tick must not crash the server)', async () => { ... });
});

// Updated REQ-048 idempotency test: setInterval count changes from 1 → 2
```

### 3. No env vars, no new packages, no DB migration

The job is hooked into the existing in-process scheduler. `INSTAGRAM_ACCESS_TOKEN` / `INSTAGRAM_BUSINESS_ACCOUNT_ID` are already declared in `InstagramService`; absent → mock-mode path. Same posture as today.

## Tests (TDD — written before implementation)

### `__tests__/lib/scheduled-jobs.test.ts` (extend, +3 cases)

- AC1 — `runInstagramRewardsJob` calls `InstagramService.processInstagramRewards` once.
- AC1 — error swallowed: `processInstagramRewards` rejects, `runInstagramRewardsJob` returns without throwing, `console.error` called.
- AC2 — `startScheduledJobs` registers **two** intervals on first call; second call is idempotent (count still 2). Replaces the REQ-048 case that asserted on `1`.

## Dependencies

- **REQ-048** — `lib/scheduled-jobs.ts` scheduler pattern + `server.ts:53` wire-up ✅
- **REQ-057** — IG handle validation in place; rewards processor will match real handles ✅
- **Existing** `InstagramService.processInstagramRewards()` + internal dedup ✅
- No new packages, no env vars, no DB migration

## Security considerations

### STRIDE

| Cat   | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** | No               | No new auth surface; job runs server-side from `server.ts` boot                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **T** | No               | No new write path; existing `InstagramService` writes are unchanged                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **R** | No               | Existing `PointsTransaction` audit trail catches every award                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **I** | No               | No new data persisted by this REQ                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **D** | Low              | Hourly Graph API call could hit rate limits (200/hr) if multiple replicas tick simultaneously. Mitigation: Railway runs single-replica today; `lib/scheduled-jobs.ts` header documents the single-instance assumption. If we scale to N>1 replicas, every replica would tick — a future REQ should add leader election (per-instance lock in Mongo, or a dedicated cron service). For now: keep ticking, monitor rate-limit hits in `processInstagramRewards`'s existing error path |
| **E** | No               | No role/permission change                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### Privacy / regulatory

- No new PII collected. IG handle was already collected via REQ-057's profile form.
- The Graph API mention/tag fetch is public IG data; matching against `User.socialProfiles.instagram.handle` is the existing IG-1/IG-2 workflow.

### Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Rollback plan

1. Single PR. `git revert <merge-sha>` removes the `runInstagramRewardsJob` export and the two scheduler lines (`setTimeout` + `setInterval`). The reward-expiry job keeps ticking independently. No data migration to roll back; any in-flight `processInstagramRewards` ticks complete normally and the next one never fires.
2. Detection: log lines `[scheduled-jobs] instagram-rewards job failed:` stop appearing; no new IG-campaign points are awarded automatically.

## Test scope

| Gate                            | Expected                                                          |
| ------------------------------- | ----------------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0                                                            |
| `npx vitest run`                | 0 failures; +3 new cases on `scheduled-jobs.test.ts`              |
| `npx eslint <changed>`          | 0 errors                                                          |
| `semgrep scan --severity=ERROR` | 0 new findings                                                    |
| `npm audit --audit-level=high`  | 0 high/critical                                                   |
| E2E focused                     | n/a — server-boot scheduler; per `project_e2e_targeted_until_117` |

## Plan deviation log

(populated during implementation if anything diverges from the above)
