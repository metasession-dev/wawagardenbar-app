# REQ-059 — Security summary

**Requirement ID:** REQ-059
**Risk class:** MEDIUM
**Surface:** new `models/instagram-post-credit-model.ts` (Mongoose model + indexes); modifications to `services/instagram-service.ts` — new public-static `processQualifyingPost` method (~110 LOC); `hasProcessedPost` promoted from `private` to `public` (AC3 fallback); old `markPostAsProcessed` stub removed; `processRule` swapped to delegate per-post decisions to the new method. No new auth surface; no route changes.

## STRIDE assessment

| Category                | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No               | No new auth surface; ledger operations run server-side from the scheduler. The IG-Graph media data is already-fetched by the existing service; REQ-059 doesn't change that boundary.                                                                                                                                                                      |
| **T** — Tampering       | Low              | Race on concurrent ticks could attempt to insert the same `postId` twice. Mitigated by unique `postId` index → E11000 → caught and treated as `skipped_already_seen`. The `Object.assign(new Error(...), { code: 11000 })` test exercises this exact code path.                                                                                           |
| **R** — Repudiation     | No               | Existing `PointsTransaction` audit trail unchanged (every award still creates a transaction row). The new `InstagramPostCredit` ledger IS an additional audit trail for the cadence accumulation — every credit insert and every status flip is timestamped.                                                                                              |
| **I** — Info disclosure | No               | Persists Meta's `postId` (public IG media id), `userId`, `ruleId`, `postedAt`, `status`. No new PII. No new query endpoint exposed by REQ-059.                                                                                                                                                                                                            |
| **D** — DoS             | Low              | Each tick: O(1) ledger existence checks per post + one indexed window-count per qualifying post + at most one award + one updateMany. Bounded by the number of qualifying IG posts per customer per windowDays (typically <10). The compound `(userId, ruleId, postedAt: -1)` index makes the window-count query an index scan; no full collection scans. |
| **E** — Elevation       | No               | No role/permission change. The scheduler runs at the same trust level as the rest of the server process.                                                                                                                                                                                                                                                  |

## Threat model — ledger lifecycle

1. **Concurrent ticks insert same postId** — unique index → E11000 thrown on the second insert. The service catches `(error as { code?: number }).code === 11000` and returns `skipped_already_seen`. Race-safe and verified by test.

2. **Partial failure between credit insert and award** — flow is `create(pending)` → `countDocuments` → `awardSocialPoints` → `updateMany(flip)`. If `awardSocialPoints` succeeds but the `updateMany` fails (rare — Mongo update with indexed query), the customer's pending credits stay pending and the **next hourly tick would re-count, hit the threshold again, and double-award**. Mitigations:
   - Operational: monitor `PointsTransaction` row counts per `(userId, ruleId)` per `windowDays` window. A second award for the same window-end is suspicious.
   - Defensive: a future REQ could wrap award + flip in a Mongo session transaction (current Mongo version supports it). Out of scope for v1.
   - Acknowledged in plan §Rollback.

3. **Stale post replayed by Meta** — IG-Graph API doesn't replay; even if it did, the unique-postId index would block any second insert.

4. **Pre-REQ-059 awarded posts re-encountered by the Graph API on a future tick** — AC3 fallback path: the legacy `hasProcessedPost(postId)` check returns `true` (the `PointsTransaction.description` still has the postId), the service inserts an `awarded` credit row (with `awardedAt = new Date()` as the best-known timestamp — the original award date is lost), and skips re-awarding. No double-grant. The fallback can retire once a full `windowDays` cycle has run with REQ-059 in place.

5. **Multi-replica deployment** — `lib/scheduled-jobs.ts` documents the single-instance assumption. If Railway scales to N>1 replicas, each replica ticks; the unique-postId index protects against double-insert, but the window-count + award could race between replicas. A future REQ should add leader election (Mongo-backed per-instance lock, or a dedicated cron service).

6. **Long-running tick blocks the next** — same concern as REQ-058; documented there.

## Privacy / regulatory

- No new PII collected. Media ids are public per IG's API documentation.
- The ledger persists `(userId, ruleId, postId, postedAt, status, awardedAt)` — a structured improvement over the previous description-regex dedup (which had no userId/ruleId structure).
- Retention is unbounded in v1. A future REQ should add a TTL index keyed on `postedAt + N days` (where N >> max `windowDays`).

## Static analysis

`semgrep scan --severity=ERROR models/instagram-post-credit-model.ts services/instagram-service.ts` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. No new packages introduced.

## Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- Removal of legacy `hasProcessedPost` fallback → future REQ after one full `windowDays` cycle.
- Mongo transaction wrapping award + flip → future REQ; current best-effort sequence is acknowledged as the partial-failure edge case.
- TTL / retention policy on `InstagramPostCredit` → future REQ.
- Multi-replica leader election → future REQ.
- Cron scheduling configurability (run only at certain hours, weekday-only campaigns) → future REQ.
