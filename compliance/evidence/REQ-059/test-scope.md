# REQ-059 — Test scope

**Requirement:** `InstagramPostCredit` sliding-window credit ledger + award trigger (#117 IG-4).

## In scope

- **Unit (model)** — `__tests__/models/instagram-post-credit-model.test.ts` (6 cases) — `status` defaults to `'pending'`; `awardedAt` defaults to `null`; required-field validation on `userId` / `ruleId` / `postId` / `postedAt`; `status` enum rejects invalid values; explicit `awardedAt` accepted; compound `(userId, ruleId, postedAt)` index + unique `postId` index registered.
- **Unit (service)** — `__tests__/services/instagram-service.ledger.test.ts` (10 cases) — covers the new `processQualifyingPost` method end-to-end: ledger primary dedup (AC2), legacy fallback insert (AC3), pending insert (AC2), sliding-window count threshold (AC4), award + flip atomic best-effort (AC5), award-failed-no-flip (AC5), concurrent-insert E11000 (AC6), default cadence (REQ-057 fallback), hourly re-tick no-op (AC6 + AC7), filter-shape verification.
- **Regression** — full vitest suite runs to confirm no impact on existing tests.
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --severity=ERROR`, `npm audit --audit-level=high`.

## Out of scope

- **Removal of legacy `hasProcessedPost` regex check** — defer to a future REQ once a full `windowDays` cycle has run with the new ledger in place.
- **Eager backfill of historical `PointsTransaction` rows into the ledger** — AC3 covers them lazily as posts re-appear via the Graph API; no upfront migration script.
- **IG-7** (customer progress card — reads from this ledger) — separate REQ.
- **IG-3** (Graph API mention/tag polling enhancements) — separate REQ.
- **IG-6** (admin campaign UI — admin metrics view aggregates cadence completions from this ledger) — separate REQ.
- **IG-8** (WhatsApp notification on award) — blocked by WA-1.
- **Multi-replica leader election** — single-instance assumption still documented in `lib/scheduled-jobs.ts` header; deferred.
- **TTL / retention policy on `InstagramPostCredit`** — future REQ.
- **E2E spec** — server-side ledger logic; unit boundary is load-bearing; honours `project_e2e_targeted_until_117` policy.

## Risk-based depth

MEDIUM risk → unit boundary at 16 cases is the load-bearing gate (6 model + 10 service). The threshold cases (AC4 + AC5) and the failure cases (AC5 award-failed, AC6 E11000) are the critical guard tests — they exercise the financial-logic decision points where regressions would cost real money. Race-safety via the unique `postId` index gets coverage via the `mockCreate.mockRejectedValue({ code: 11000 })` simulation; the partial-failure between award + flip is acknowledged in `security-summary.md` as an operational concern with monitoring as the mitigation.
