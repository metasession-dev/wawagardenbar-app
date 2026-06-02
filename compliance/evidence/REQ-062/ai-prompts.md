# REQ-062 — AI prompts log

**Date:** 2026-06-02

## Session prompts (user → AI)

1. `what other issues can we bunch together and release`
   - AI surveyed the remaining #117 backlog + standalone GitHub issues and proposed five thematic bundles (customer trust polish, IG admin completion, customer self-service, staff productivity, bug regression). Recommended Bundle A (customer trust polish) as highest-impact-per-cost.

2. `REQ-062 = Bundle A (customer trust polish). ...`
   - Operator selected Bundle A. AI surveyed the four sub-items (P0 #5, P1 #6, P1 #9, P1 #11), discovered the SMS bypass in `communication-actions.ts:56` and the absent `/contact` page (footer commented out, order-details page links broken). Presented plan with 6 ACs + STRIDE + behavioural-change flag for AC1.

3. Selected via AskUserQuestion:
   - REQ-062 plan: "Approve as scoped (Recommended)" — including the AC1 behavioural change that stops SMS confirmations for customers without explicit consent.

4. `#259 was cancelled, will it be picked back up?`
   - AI investigated: #259's CI Pipeline run was cancelled by `concurrency: cancel-in-progress: true` in ci.yml because #260 merged ~17s after. PR itself was MERGED. Develop tip includes both #259's changes (audit-log export in CI) and #260's REQ-062 code. Explained the cancellation is benign — the new audit-log export step will exercise on the next compliance-evidence.yml push (which is this Phase 3 evidence pack).

5. `#260 merged`
   - Confirmation that the integration PR landed cleanly with `Release version: REQ-062` step-3 attribution. AI started assembling Phase 3 evidence pack per `feedback_phase3_release_ticket_mandatory`.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills invoked. The work is action + library + UI templating; no e2e author work needed (per `project_e2e_targeted_until_117` + scope justification — unit + manual-UAT boundary covers).

## Decision points

- **Bundle A scope** — kept P0 #5 (SMS consent gate) in the bundle. The alternative was to defer it as a separate REQ, but bundling let us close the consent gap REQ-054 left open in the same trust-polish cycle. The behavioural change (stops SMS for non-opted-in customers) is explicit and operator-approved.

- **All-three-channels through NotificationService** — collapsed the action's previous two-path flow (SMS direct + WhatsApp/email via NotificationService) into one. Closes the SMS bypass cleanly and makes the action consistent.

- **Email itemization fields all optional** — backwards-compat is load-bearing here. The action's caller passes the new fields when the order has them; existing test callers don't break.

- **ReorderButton v1 naïve add** — supplies `category=''`/`preparationTime=0` because order-item snapshots don't carry those fields. The customer's cart view + checkout flow validates inventory at checkout. v2 menu-state resolution (handle deleted items, price changes, customisation conflicts) is a future REQ.

- **No component test for ReorderButton or `/contact`** — high-effort for low-return on these surfaces; manual UAT covers. Documented in test-scope as out-of-scope.

- **WhatsApp "recommended" on the contact page** — matches the project's strategic direction. tel: + mailto: as secondary options.

- **Uncommenting the footer `/contact` link** — wasn't in the plan ACs but is the obvious last-mile fix once the page exists. Captured in commit message.

- **#259 cancellation answer** — investigated rather than assumed. Concurrency rule cancellation is benign because develop tip includes both PRs and the in-flight run re-evaluates the combined tip.

## Audit cross-refs

- Parent backlog: #117 (P0 #5 + P1 #6 + P1 #9 + P1 #11).
- Direct dependencies:
  - REQ-054 — NotificationService.send with consent gating ✅
  - REQ-061 — SettingsService.getSettings() for contact page hours ✅
- Cycle artefacts: PR #260 (integration), PR #261 (Phase 3 evidence pack — about to open), upcoming release PR develop → main, upcoming close-out PR.
- Concurrent-merge note: PR #259 (devaudit 0.1.33 sync) merged ~17s before #260; its CI Pipeline run was cancelled by concurrency rule but its code is live on develop.
- Project memory honoured: `feedback_sdlc_impl_plan_review`, `feedback_tests_before_push`, `feedback_wait_for_ci`, `feedback_single_pr_default`, `feedback_pr_title_req_brackets`, `feedback_no_delete_develop_on_release_merge`, `project_e2e_targeted_until_117`, `feedback_phase3_release_ticket_mandatory`.
- Unblocks future work:
  - PDF receipt download (P1 #7)
  - WhatsApp receipt template (blocked at Meta as WA-1)
  - Reorder smart-merge (v2 menu-state resolution)
  - Re-routing admin SMS through NotificationService (out-of-scope; admin paths don't have consent)
