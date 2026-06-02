# REQ-059 — InstagramPostCredit ledger + sliding-window award trigger

**Requirement ID:** REQ-059
**Risk Level:** MEDIUM
**GitHub Issue:** [#117 IG-4](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-02

## Context

REQ-058 hooked `InstagramService.processInstagramRewards()` into the in-process scheduler so it now ticks hourly. The service has had dedup since day one via `hasProcessedPost(mediaId)` — but the dedup is a **naive regex match against `PointsTransaction.description`**. It works for the "was this post already awarded?" check but has two practical limitations:

1. **No notion of pending state** — a post that's qualified but hasn't yet triggered an award (because the customer is at 1/3 in a 3-post-in-7-days cadence) has nowhere to live. The service today either awards immediately on every qualifying post or skips it; there's no accumulation.
2. **Naive regex** — string-matching descriptions is fragile and doesn't scale to filtering by `(userId, ruleId, postedAt)` for sliding-window queries.

REQ-059 introduces `InstagramPostCredit` as the canonical ledger: one row per (userId, ruleId, postId) tuple, status `pending` until the sliding-window threshold is reached, then `awarded` with `awardedAt` stamped. The processor inserts on every qualifying post and fires `RewardsService.awardSocialPoints` when `pending` credits in the window reach `postsRequired`.

The naive `hasProcessedPost` regex check stays as a **transition-period fallback** (AC3): for posts that were awarded pre-REQ-059, the ledger doesn't know about them, but `PointsTransaction.description` does. When the fallback fires, the service inserts an `awarded` credit row for ledger visibility and skips re-awarding. After a full `windowDays` cycle has run, a future REQ can retire the fallback.

## Acceptance criteria

1. **AC1 — `InstagramPostCredit` model** — new Mongoose model `models/instagram-post-credit-model.ts` with:
   - `userId: ObjectId` (required, indexed) — `ref: 'User'`
   - `ruleId: ObjectId` (required, indexed) — `ref: 'RewardRule'`
   - `postId: string` (required, unique) — Meta's media id; the dedup gate
   - `postedAt: Date` (required, indexed) — for sliding-window queries
   - `status: 'pending' | 'awarded'` (required, default `'pending'`, enum)
   - `awardedAt: Date | null` (default `null`) — stamped when the credit triggers an award
   - `createdAt` / `updatedAt` via `{ timestamps: true }`
   - Compound index `{ userId: 1, ruleId: 1, postedAt: -1 }` for the window-count query
   - Unique index `{ postId: 1 }` for race-safe dedup

2. **AC2 — Ledger replaces naive dedup as primary** — `InstagramService.processRule` switches from `await this.hasProcessedPost(post.id)` (regex against `PointsTransaction.description`) to `await InstagramPostCredit.exists({ postId: post.id })` as the primary check. If a credit row exists, skip the post.

3. **AC3 — Legacy fallback during transition** — when `InstagramPostCredit` doesn't have the postId but `hasProcessedPost` does (an old award fired pre-REQ-059), insert a credit row with `status: 'awarded'`, `awardedAt: new Date()` (best-known timestamp — the original award date is lost), `postedAt: postDate` (from the Graph API payload). Skip re-awarding. The fallback can retire in a future REQ once a full `windowDays` cycle has passed.

4. **AC4 — Sliding-window pending count → award threshold** — after inserting a new `pending` credit, the service counts `pending` credits for `(userId, ruleId)` within the rolling `windowDays` window:

   ```ts
   const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
   const pendingCount = await InstagramPostCredit.countDocuments({
     userId,
     ruleId,
     status: 'pending',
     postedAt: { $gte: windowStart },
   });
   ```

   When `pendingCount >= postsRequired`, fire the award.

5. **AC5 — Award + flip atomically (best-effort)** —

   ```ts
   await RewardsService.awardSocialPoints(
     userId.toString(),
     rule.socialConfig.pointsAwarded,
     `Instagram Reward: #${hashtag} cadence`,
     // Mark the triggering post in description for grep continuity
     post.id
   );
   await InstagramPostCredit.updateMany(
     { userId, ruleId, status: 'pending', postedAt: { $gte: windowStart } },
     { $set: { status: 'awarded', awardedAt: new Date() } }
   );
   ```

   If `awardSocialPoints` throws, the `updateMany` doesn't run — credits stay `pending` and the next hourly tick retries naturally.

6. **AC6 — Hourly re-tick idempotent** — same `postId` never inserted twice (unique-index → E11000 → service catches and treats as "already seen", skipping the post). Same window never awards twice — once flipped to `awarded`, those credits no longer count toward the threshold; subsequent posts in the same window start a fresh accumulator.

7. **AC7 — `markPostAsProcessed` retired (partial)** — the old stub `markPostAsProcessed(_mediaId, _userId, _ruleId)` is removed. The new ledger-insert call is the canonical "mark processed" action. The `hasProcessedPost` stub stays as the AC3 fallback only; its docstring updates to reflect the transition role.

## Technical approach

### 1. `models/instagram-post-credit-model.ts` (new, ~70 LOC)

```ts
import {
  Schema,
  model,
  models,
  type Model,
  type Document,
  type Types,
} from 'mongoose';

export type InstagramPostCreditStatus = 'pending' | 'awarded';

export interface IInstagramPostCredit extends Document {
  userId: Types.ObjectId;
  ruleId: Types.ObjectId;
  postId: string;
  postedAt: Date;
  status: InstagramPostCreditStatus;
  awardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IInstagramPostCredit>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    ruleId: {
      type: Schema.Types.ObjectId,
      ref: 'RewardRule',
      required: true,
      index: true,
    },
    postId: { type: String, required: true, unique: true },
    postedAt: { type: Date, required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'awarded'],
      default: 'pending',
    },
    awardedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

schema.index({ userId: 1, ruleId: 1, postedAt: -1 });

const InstagramPostCreditModel: Model<IInstagramPostCredit> =
  (models.InstagramPostCredit as Model<IInstagramPostCredit>) ||
  model<IInstagramPostCredit>('InstagramPostCredit', schema);

export default InstagramPostCreditModel;
```

### 2. `services/instagram-service.ts` (modify, ~60 LOC change)

Replace the existing `processRule` body's dedup + award block (lines ~125-148) with the ledger-aware flow. Keep `hasProcessedPost` as the fallback check only. Remove `markPostAsProcessed` stub (no longer used).

### 3. Tests

- `__tests__/models/instagram-post-credit-model.test.ts` (~6 cases) — schema defaults, required-field validation, status enum, unique-postId rejection (E11000 mock), `userId: null` rejected (required), guest path n/a.
- `__tests__/services/instagram-service.ledger.test.ts` (~10 cases) — see Tests section below.

### 4. No env vars, no new packages, no DB migration

`InstagramPostCredit` collection created lazily on first write. Existing `PointsTransaction` rows untouched.

## Tests (TDD — written before implementation)

### `__tests__/models/instagram-post-credit-model.test.ts` (~6 cases)

- AC1 — `status` defaults to `'pending'`
- AC1 — `awardedAt` defaults to `null`
- AC1 — required fields throw validation if missing (`userId`, `ruleId`, `postId`, `postedAt`)
- AC1 — `status` enum rejects invalid values (e.g. `'queued'`)
- AC1 — schema indexes registered: `(userId, ruleId, postedAt)` compound + unique `postId`
- AC1 — `awardedAt: new Date()` accepted explicitly

### `__tests__/services/instagram-service.ledger.test.ts` (~10 cases)

Service-level via mocked model + mocked RewardsService:

- AC2 — new post (no ledger row, no legacy match) → `InstagramPostCredit.create({ status: 'pending', ... })` called
- AC2 — existing ledger row for postId → service skips (no insert, no award)
- AC3 — no ledger row but `hasProcessedPost` returns true → service inserts `status: 'awarded'` credit, no award fires
- AC4 — `pendingCount < postsRequired` → no award, credit stays `pending`
- AC4 — `pendingCount === postsRequired` → award fires
- AC5 — award fires once: `RewardsService.awardSocialPoints` called once, `updateMany` flips pending → awarded with `awardedAt`
- AC5 — `awardSocialPoints` throws → `updateMany` NOT called; credit stays `pending`; service catches and logs
- AC6 — `InstagramPostCredit.create` E11000 (concurrent insert) → caught, treated as "already seen", no re-award
- AC6 — already-awarded credits don't count toward the next window's threshold
- AC7 — hourly re-tick with same posts → no-op (every dedup-check returns existing-credit)

## Dependencies

- **REQ-048** — scheduler precedent ✅
- **REQ-057** — `postsRequired` / `windowDays` defaults + paired-validity ✅
- **REQ-058** — scheduler ticks `processInstagramRewards` hourly ✅
- **Existing** `InstagramService.processRule` + `RewardsService.awardSocialPoints` ✅
- No new packages, no env vars, no DB migration

## Security considerations

### STRIDE

| Cat                     | Risk introduced? | Rationale / mitigation                                                                                                                                                                                     |
| ----------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No               | No new auth surface; service runs server-side from scheduler                                                                                                                                               |
| **T** — Tampering       | Low              | Race on concurrent ticks could attempt to insert the same `postId` twice. Mitigated by unique `postId` index → E11000 → service catches and treats as no-op                                                |
| **R** — Repudiation     | No               | Existing `PointsTransaction` audit trail unchanged; new `InstagramPostCredit` ledger is itself an audit trail for the cadence accumulation                                                                 |
| **I** — Info disclosure | No               | Persists Meta media id (public), `userId`, `ruleId`, `postedAt`, `status`. No new PII                                                                                                                      |
| **D** — DoS             | Low              | Each tick: O(1) ledger lookups per post + one indexed window-count per qualifying post. Bounded by # IG posts per customer per window (typically <10). Compound index makes the window query an index scan |
| **E** — Elevation       | No               | No role/permission change                                                                                                                                                                                  |

### Threat model — ledger lifecycle

1. **Concurrent ticks insert same postId** — unique index → E11000 thrown on the second insert. Service catches with `error.code === 11000`, logs, skips the post. Race-safe.
2. **Partial failure between credit insert + award** — credit is `pending`; next tick sees the credit, doesn't insert again, but the window-count check still includes it. If the window reaches threshold again on the next tick, the award fires. Idempotent on the value side because the description-stamped `PointsTransaction` plus the `updateMany` filter both guard against double-grant in the typical case. **Edge case acknowledged:** if the award succeeds but the `updateMany` fails, the customer is over-rewarded — same credits would re-trigger on next tick. Practically rare (Mongo update on indexed query); operational mitigation via monitoring of `PointsTransaction` row counts per customer per window.
3. **Stale post replayed by Meta** — Graph API doesn't replay; even if it did, the unique-postId index blocks.
4. **Long-running tick blocks the next** — same concern as REQ-058; not new.

### Privacy / regulatory

- No new PII. Media ids are public per IG's API documentation.
- Retention is unbounded in v1. A future REQ can add a TTL index keyed on `postedAt + N days` (where N >> max windowDays).

### Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Rollback plan

1. Single PR. `git revert <merge-sha>` removes the ledger model + the `processRule` ledger swap; service reverts to naive description-regex dedup.
2. `InstagramPostCredit` collection persists in Mongo (orphaned, harmless).
3. **Rollback risk window:** posts that received a `pending` credit (ledger only) when the revert lands could double-award on next tick under the legacy code. Mitigation: ensure no `pending` credits exist before reverting — either wait for the scheduler's next tick to flip all pending → awarded, or pause the scheduler during rollback.
4. Detection: `InstagramPostCredit.find().count()` stops growing post-revert; awards revert to per-post-immediate (the previous behaviour).

## Test scope

| Gate                            | Expected                                                             |
| ------------------------------- | -------------------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0                                                               |
| `npx vitest run`                | 0 failures; +~16 new cases (6 model + 10 service)                    |
| `npx eslint <changed>`          | 0 errors                                                             |
| `semgrep scan --severity=ERROR` | 0 new findings                                                       |
| `npm audit --audit-level=high`  | 0 high/critical                                                      |
| E2E focused                     | n/a — server-side ledger logic; per `project_e2e_targeted_until_117` |

## Plan deviation log

(populated during implementation if anything diverges from the above)
