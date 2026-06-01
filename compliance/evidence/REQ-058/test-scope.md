# REQ-058 — Test scope

**Requirement:** Schedule `InstagramService.processInstagramRewards()` on the in-process scheduler (#117 IG-5).

## In scope

- **Unit (scheduler)** — `__tests__/lib/scheduled-jobs.test.ts` (extended, 5 cases total — 2 pre-existing REQ-048 + 3 new REQ-058) — `runInstagramRewardsJob` happy path calls `InstagramService.processInstagramRewards` once; error-swallowing path returns void and logs to `console.error` without re-throwing; `startScheduledJobs()` registers **two** intervals on first call (REQ-048 + REQ-058) and is idempotent on second call (no stacking — count stays at 2).
- **Regression** — full vitest suite runs to confirm no impact on existing tests.
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --severity=ERROR`, `npm audit --audit-level=high`.

## Out of scope

- **IG-3** (Graph API mention/tag polling enhancements — improve the post-discovery logic) — separate REQ; bigger.
- **IG-4** (`InstagramPostCredit` sliding-window credit ledger + award trigger; replaces current naive `hasProcessedPost(mediaId)` description-regex dedup) — separate REQ.
- **IG-6** (admin campaign UI in `/dashboard/rewards`) — separate REQ.
- **IG-7** (customer-facing campaign progress card) — separate REQ.
- **IG-8** (WhatsApp notification on award) — blocked by WA-1.
- **Multi-replica leader election** — single-instance assumption documented in `lib/scheduled-jobs.ts` header; deferred until Railway scales to N>1 replicas.
- **Integration test exercising the real Graph API** — Graph API calls are out of scope; existing `processInstagramRewards` mock-mode path serves dev/test environments.
- **E2E spec** — server-boot scheduler; unit boundary is load-bearing; honours `project_e2e_targeted_until_117` policy.

## Risk-based depth

LOW risk → unit boundary at 5 cases is the load-bearing gate (2 pre-existing REQ-048 regression + 3 new REQ-058). The job follows the exact pattern of `runRewardExpiryJob` (REQ-048 precedent) — error-swallowing, idempotent, single-instance assumption documented. The two-interval idempotency test is the load-bearing safety check: prevents double-registration on hot-reload that would otherwise spawn multiple parallel cron loops.
