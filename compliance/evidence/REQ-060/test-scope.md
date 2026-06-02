# REQ-060 — Test scope

**Requirement:** Customer-facing Instagram campaign progress card (#117 IG-7).

## In scope

- **Unit (service)** — `__tests__/services/instagram-service.campaigns.test.ts` (7 cases — 1 extra over the planned 6) covering `InstagramService.getActiveCampaignsForUser(userId)`:
  - No active rules → returns `[]`
  - Rules exist but none currently-active (date filter via `isCurrentlyActive()`) → returns `[]`
  - One active rule with 0 user pending → returns `[{ currentProgress: 0 }]`
  - One active rule with 2 user pending → returns `[{ currentProgress: 2 }]`
  - `countDocuments` filter shape: `userId` + `ruleId` + `status: 'pending'` + `postedAt: { $gte: now - windowDays * DAY_MS }` (drift < 1 minute)
  - Multiple active rules → one entry per rule
  - DB failure → catches via try/catch, returns `[]`, logs `console.error` (does not throw)
- **Regression** — full vitest suite (1014 pass) confirms no impact on existing tests.
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --severity=ERROR`, `npm audit --audit-level=high`.

## Out of scope

- **Component test for `<InstagramCampaignCard>`** — React Testing Library + Next.js server-component testing is non-trivial; the JSX is straightforward (single conditional on `campaigns.length === 0`, map over campaigns); manual UAT verification on the customer rewards page covers the surface.
- **IG-3** (Graph API mention/tag polling enhancements) — separate REQ.
- **IG-6** (admin metrics view of cadence completions across users) — separate REQ.
- **IG-8** (WhatsApp award notification) — blocked by WA-1.
- **"You've earned N total rewards in this campaign" stat** — not in IG-7's spec; nice-to-have for a future card section.
- **Click-through link to bar's IG profile** — future UX polish.
- **Customer-visible "campaign ends in X days" countdown** — defer; the windowDays text already conveys the cadence.
- **E2E spec** — read-only customer surface; unit boundary is load-bearing; honours `project_e2e_targeted_until_117` policy.

## Risk-based depth

LOW risk → unit boundary at 7 service cases is the load-bearing gate. The card is presentational (server component, no client state, no side effects); its empty-state and populated-state branches are exercised by the page integration in UAT. The `countDocuments` filter-shape test is the load-bearing check for AC3 (sliding-window correctness) — if the window math drifts, future REQs (IG-3 polling enhancements, future TTL policy) inherit the bug.
