# REQ-060 — Security summary

**Requirement ID:** REQ-060
**Risk class:** LOW
**Surface:** new public-static `InstagramService.getActiveCampaignsForUser(userId)` aggregator (~80 LOC in `services/instagram-service.ts`); new `<InstagramCampaignCard>` server component (`components/features/rewards/instagram-campaign-card.tsx`, ~50 LOC); ~5 LOC wire-up in `app/(customer)/profile/rewards/page.tsx` (added to existing `Promise.all`; card render block).

## STRIDE assessment

| Category                | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No               | Aggregator scoped by `userId` at the page layer (`session.userId` from iron-session). The customer rewards page already requires authentication; redirect to `/login?redirect=/profile/rewards` if `!session.userId`. No new auth surface.                                                                                                                                                                  |
| **T** — Tampering       | No               | Read-only query. No write path. The aggregator can't accept arbitrary userId from the client — the page passes `session.userId` server-side.                                                                                                                                                                                                                                                                |
| **R** — Repudiation     | No               | No state change. No new audit-trail surface.                                                                                                                                                                                                                                                                                                                                                                |
| **I** — Info disclosure | Low              | The card exposes the signed-in customer's own progress count + the public campaign config (hashtag, postsRequired, pointsAwarded). All this data is already authored by the bar's admin (RewardRule is admin-managed) and would be visible via other surfaces (e.g. the "Types of Rewards Available" card below it). No cross-user data leakage by construction — the filter is `userId: <session.userId>`. |
| **D** — DoS             | Low              | Per page load: 1 `RewardRule.find` (indexed by `isActive` + `triggerType`) + N `countDocuments` (one per active campaign, typically 1–2). The compound `(userId, ruleId, postedAt: -1)` index from REQ-059 makes each `countDocuments` an index scan; no full collection scans. Page load time impact is microseconds in steady state.                                                                      |
| **E** — Elevation       | No               | No role/permission change. The aggregator runs server-side at the customer trust level.                                                                                                                                                                                                                                                                                                                     |

## Threat model — read-side lifecycle

1. **Customer requests `/profile/rewards`** — `getIronSession` resolves the session. Unauthenticated → redirect to `/login`. Authenticated → continue.
2. **Aggregator runs server-side** — `InstagramService.getActiveCampaignsForUser(session.userId)` loads active rules, filters by `isCurrentlyActive()`, counts pending credits per `(userId, ruleId)` per window.
3. **Component renders with the data** — server component receives `campaigns` as a prop, maps to JSX, sends HTML to the browser.
4. **Customer sees their own progress** — no client-side fetch, no cross-user data possible.

Failure modes:

1. **DB connection drop mid-aggregator** — `getActiveCampaignsForUser`'s outer try/catch logs via `console.error` and returns `[]`. The page renders without the IG card (silent empty state). No 500 surfaced to the customer.

2. **Active rule with no `socialConfig`** — the `if (!sc) continue;` guard skips that rule. Defensive; shouldn't happen given REQ-057's schema constraints, but cheap to guard.

3. **Active rule with missing cadence fields** — defaults to `postsRequired: 3, windowDays: 7, pointsAwarded: 0` via `??`. The defaults match REQ-057's schema defaults; consistent with the aggregator's behaviour if the schema defaults somehow get bypassed.

4. **Concurrent page loads for the same customer** — each load runs the aggregator independently; no shared mutable state.

5. **Customer triggers the page while the scheduler is mid-tick** — the aggregator sees the ledger state at the moment of its `countDocuments` call. A credit could be inserted after the count returns; the card might show 1/3 momentarily before a refresh shows 2/3. Acceptable read-side eventual-consistency; no correctness issue.

## Privacy / regulatory

- No new PII collected. Progress count is the customer's own data, derived from posts the customer made publicly on Instagram.
- The card surfaces hashtag and post-cadence — public campaign config the bar's admin publishes.
- Server-side rendering means no progress data crosses to the client until the customer authenticates.

## Static analysis

`semgrep scan --severity=ERROR services/instagram-service.ts components/features/rewards/instagram-campaign-card.tsx` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. No new packages introduced.

## Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- Component-level snapshot tests → not added; the JSX is presentational with one conditional branch; manual UAT verification covers the surface.
- TTL / retention policy on `InstagramPostCredit` → future REQ.
- IG-3 (Graph API polling enhancements) → separate REQ.
- IG-6 (admin metrics view) → separate REQ.
- IG-8 (WhatsApp award notification) → blocked by WA-1.
- "Campaign ends in X days" countdown → future card section.
