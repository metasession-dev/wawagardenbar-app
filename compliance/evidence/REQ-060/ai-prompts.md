# REQ-060 — AI prompts log

**Date:** 2026-06-02

## Session prompts (user → AI)

1. `IG-7 as REQ-060` (after REQ-059 close-out merged)
   - AI surveyed the customer rewards page (`app/(customer)/profile/rewards/page.tsx`), confirmed REQ-059's ledger was in place, presented the plan with 7 ACs + STRIDE + rollback. LOW risk → no formal approval gate; proceeded with TDD.

2. `#250 merged`
   - Confirmation that the integration PR landed cleanly with `Release version: REQ-060` step-3 attribution. AI started assembling Phase 3 evidence pack per `feedback_phase3_release_ticket_mandatory`.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills invoked. Read-only customer surface; no e2e author work needed (per `project_e2e_targeted_until_117` policy + scope justification — unit + manual-UAT boundary covers the surface). `sdlc-implementer` ran end-to-end; `e2e-test-engineer` was not invoked.

## Decision points

- **Server component, not client component** — `<InstagramCampaignCard>` is a server component. Server-side render with the aggregated `campaigns` prop passed in. No client-side fetch, no client state. Embeds shadcn `<Progress>` as a client island; Next.js handles the boundary transparently.

- **Silent empty state** — `if (campaigns.length === 0) return null;`. The customer rewards page already has the "Types of Rewards Available" card with its own empty state for when there are zero rules; adding "no active IG campaigns" would be redundant clutter for the majority of customers.

- **`getActiveCampaignsForUser` is defensive by design** — outer try/catch returns `[]` on DB failure with `console.error`. The customer rewards page is composed of N independent reads via `Promise.all`; one read failing shouldn't 500 the whole page. The `[]` return + silent empty-state card combination means an IG-side outage is invisible to customers (they just don't see the card).

- **`pointsAwarded` exposed at progress 0** — the campaign value proposition ("Earn 100 points") IS the reason to engage, so it must surface even when the customer hasn't started yet. Without it the card would say "0/3 — earn ??? points" which is worse than no card at all.

- **Defaults match REQ-057** — `postsRequired ?? 3`, `windowDays ?? 7`. Same defaults as the Mongoose schema; if a rule's `socialConfig` is missing those fields for any reason (shouldn't happen post-REQ-057, but defensive), the aggregator falls back to the same numbers the rest of the system uses.

- **No component test** — Next 16 server-component RTL is non-trivial and the JSX has one conditional. Manual UAT verification covers the surface. The LOAD-bearing test is the service aggregator (filter shape, defaults, defensive DB-failure path).

- **Aggregator added at the END of `Promise.all` destructure** — preserves the indices of the existing 6 reads. No churn to other code paths.

- **The REQ-057 → REQ-058 → REQ-059 → REQ-060 chain is now the cleanest stretch of the project** — four consecutive 3-PR-to-release cycles with zero re-attribution, zero CVE blocks, zero Phase 3 catch-up. The `feedback_phase3_release_ticket_mandatory` memory has been load-bearing.

## Audit cross-refs

- Parent backlog: #117 (IG-7).
- Direct dependencies:
  - REQ-057 — `socialConfig.postsRequired` / `windowDays` defaults ✅
  - REQ-058 — scheduler ticks the processor so credits accumulate ✅
  - REQ-059 — `InstagramPostCredit` ledger with `pending`/`awarded` state ✅
  - Existing `RewardRule.isCurrentlyActive()` instance method ✅
  - Existing shadcn `Progress` component ✅
- Cycle artefacts: PR #250 (integration), PR #251 (Phase 3 evidence pack — about to open), upcoming release PR (develop → main), upcoming close-out PR.
- Project memory honoured: `feedback_sdlc_impl_plan_review`, `feedback_tests_before_push`, `feedback_wait_for_ci`, `feedback_single_pr_default`, `feedback_pr_title_req_brackets`, `feedback_no_delete_develop_on_release_merge`, `project_e2e_targeted_until_117`, `feedback_phase3_release_ticket_mandatory`.
- Unblocks future work: IG-6 (admin metrics view aggregates cadence completions across users), IG-8 (WhatsApp award notification — blocked at WA-1).
