# REQ-057 — Test scope

**Requirement:** Instagram engagement foundation — IG-1 cadence defaults + paired-validity hook on `RewardRule.socialConfig`; IG-2 Instagram handle format validation (#117 IG-1 + IG-2).

## In scope

- **Unit (schema)** — `__tests__/services/reward-rule-cadence-schema.test.ts` (extended, 11 cases total — 4 pre-existing + 7 new for REQ-057) — defaults applied on `postsRequired` / `windowDays`; pre-validate hook rejects half-set cadence; both-set passes; neither-set (explicit-null) passes (legacy mode). Tests use async `.validate()` because Mongoose `validateSync()` skips `pre('validate')` middleware.
- **Unit (zod)** — `__tests__/actions/profile-actions.instagram-handle.test.ts` (new, 16 cases) — exported `instagramHandleSchema` pipe is the shared client+server validator. Cases cover the transform (strip leading `@`, trim whitespace) and the refine (`^[a-zA-Z0-9._]{1,30}$` character set, empty-string sentinel, 31-char rejection, XSS-shape rejection).
- **Regression** — full vitest suite runs to confirm no impact on existing tests.
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --severity=ERROR`, `npm audit --audit-level=high`.

## Out of scope

- **IG-3** (Graph API mention/tag polling job) — separate REQ; bigger.
- **IG-4** (`InstagramPostCredit` sliding-window credit ledger + award trigger) — separate REQ.
- **IG-5** (scheduling `processInstagramRewards()`) — separate REQ; reuses REQ-048's `lib/scheduled-jobs.ts` in-process scheduler precedent.
- **IG-6** (admin campaign UI in `/dashboard/rewards`) — separate REQ.
- **IG-7** (customer-facing campaign progress card) — separate REQ.
- **IG-8** (WhatsApp notification on award) — blocked by WA-1 (Meta WABA restriction).
- **`requireHashtag` renaming** — existing `hashtag` field already covers the intent; renaming would force a Mongoose migration with no value.
- **`campaignStart` / `campaignEnd` named fields** — existing top-level `startDate` / `endDate` + `campaignDates[]` array already covers the campaign-window intent.
- **E2E spec** — server-side schema + form validation; unit boundary is load-bearing; honours `project_e2e_targeted_until_117` policy.

## Risk-based depth

LOW risk → unit boundary at 23 cases is the load-bearing gate (4 pre-existing schema regression + 7 schema defaults/hook + 12 zod handle). No new auth surface, no data migration, no new packages. The regex tightening on the handle is a security-positive (blocks `<script>` shapes that the previous `.max(30)` admitted). The paired-validity hook is the only place that catches half-set cadence — defaults make that state unreachable via normal API surface but the hook still guards explicit-null and direct-Mongo writes.
