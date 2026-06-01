# REQ-057 — AI prompts log

**Date:** 2026-06-01

## Session prompts (user → AI)

1. `whats next`
   - AI surveyed #117 backlog status (WA bundle wall-blocked at WA-1/WA-6, IG bundle open) and recommended IG-1 + IG-2 as REQ-057 (small, no Meta dependency, unlocks IG-3/4/6).

2. `#234 merged, proceed with plan IG-1 + IG-2 as REQ-057`
   - AI presented the implementation plan with scope-shrink discovery (most of IG-1/IG-2 surface already implemented) and asked two sanity-check questions before coding (keep `hashtag` name vs renaming; reuse top-level `startDate`/`endDate` vs adding `campaignStart`/`campaignEnd`).

3. `go this https://github.com/metasession-dev/wawagardenbar-app/pull/235 before proceeding`
   - AI reviewed PR #235 (DevAudit 0.1.29 sync — landed upstream #93/#95/#96 fixes from REQ-053/REQ-056 cycles) and recommended merging it first so REQ-057's release cycle would benefit from + implicitly test the new infrastructure.

4. `yes`
   - Operator authorised merging #235; AI merged it (commit `f052b32`) and proceeded with REQ-057 implementation.

5. `#235 merged`
   - Confirmation that develop CI on #236's merge (typo — meant #236, the REQ-057 integration PR) completed successfully. `Release version: REQ-057` clean step-3 attribution. AI started assembling Phase 3 evidence pack per the new `feedback_phase3_release_ticket_mandatory` memory.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills were invoked for REQ-057. The work is schema-level + form validation; no e2e author work needed (per the `project_e2e_targeted_until_117` policy AND per the scope justification — unit boundary at 27 cases covers the surface). `sdlc-implementer` ran end-to-end; `e2e-test-engineer` was not invoked.

## Decision points

- **Scope-shrink — keep `hashtag` field name** instead of renaming to `requireHashtag` per #117 spec. The existing `hashtag` field at `socialConfig.hashtag` (single string) already covers the "optional hashtag filter" intent. Renaming would force a Mongoose migration with no functional benefit. Operator confirmed at plan time.

- **Scope-shrink — reuse `startDate`/`endDate` + `campaignDates[]`** instead of adding new `campaignStart`/`campaignEnd` fields inside `socialConfig` per #117 spec. The existing top-level dates already serve the campaign-window need. `campaignDates[]` even supports multiple non-contiguous ranges (e.g. weekend-only campaigns). Operator confirmed at plan time.

- **Mongoose `validateSync()` skips middleware** — discovered during TDD. Initial paired-validity tests called `doc.validateSync()` and got `undefined` err with no hook invocation. Confirmed via the Mongoose source: `validateSync()` explicitly bypasses `pre('validate')` middleware. Tests converted to async `.validate()`; real-world write paths (`.save()`) DO run the hook, so production behaviour is correct.

- **Defaults make the half-state unreachable from the normal API surface** — once `postsRequired: 3` / `windowDays: 7` defaults are in place, a partial-cadence rule can only enter Mongo via explicit-null assignment or direct-Mongo writes (bypassing Mongoose). The pre-validate hook still matters for those edge cases (admin form explicitly clearing the field, scripts writing to Mongo directly, documents pre-dating the defaults). The hook is the load-bearing guard; defaults are the operator-friendly affordance.

- **Shared zod schema via import** — exported `instagramHandleSchema` from the action module rather than duplicating the pipe in the client form. Single source of truth; no drift between client and server validators. The client form's `profileSchema` imports the shared piece via `import { instagramHandleSchema } from '@/app/actions/profile/profile-actions'`.

- **Regex character set chosen to match Instagram's actual rules** — `^[a-zA-Z0-9._]{1,30}$`. Instagram permits letters, numbers, periods, and underscores; max 30 chars. Periodic-and-underscore handles like `foo.123` and `foo_bar` are common.

- **Explainer copy tied to upcoming campaign UI** — the helper text now reads "Required to earn points on Instagram tagging campaigns — we use this to match your tags to your account." This sets expectations for IG-6 (admin campaign UI) and IG-7 (customer-facing progress card), so customers can connect the dots when those land.

- **Phase 3 BEFORE release PR** — explicit reversal of REQ-056's order-of-operations bug. The new `feedback_phase3_release_ticket_mandatory` memory is the binding instruction; the evidence pack must reach the portal (via Compliance Evidence Upload on develop push) before the release PR's Release Approval Gate can find a `uat_review`-state release.

## Audit cross-refs

- Parent backlog: #117 (IG-1 + IG-2).
- Direct dependencies: REQ-053 (Mongoose schema defaults pattern), REQ-048 (`lib/scheduled-jobs.ts` precedent for IG-5 future REQ).
- Cycle artefacts: PR #236 (integration), PR #237 (Phase 3 evidence pack — pending merge), upcoming release PR (develop → main), upcoming close-out PR.
- Upstream fixes landed in this cycle's prerequisite sync (PR #235 / devaudit 0.1.29): DevAudit-Installer #93 (CC_REGEX), #95 (RTM-driven attribution step 4-bis), #96 (upload-evidence on failure). All three were filed during REQ-053 / REQ-056 cycles.
- Project memory honoured: `feedback_sdlc_impl_plan_review`, `feedback_tests_before_push`, `feedback_wait_for_ci`, `feedback_single_pr_default`, `feedback_pr_title_req_brackets`, `feedback_no_delete_develop_on_release_merge`, `project_e2e_targeted_until_117`, **`feedback_phase3_release_ticket_mandatory`** (NEW from REQ-056 close-out).
- Unblocks future work: IG-3 (Graph API mention/tag polling), IG-4 (`InstagramPostCredit` ledger + sliding-window award trigger), IG-5 (cron scheduling), IG-6 (admin campaign UI), IG-7 (customer progress card), IG-8 (WhatsApp award notification — blocked by WA-1).
