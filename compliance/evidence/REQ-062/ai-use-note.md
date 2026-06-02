# REQ-062 — AI use note

**Date:** 2026-06-02
**Tool:** Claude Code (Opus 4.7) via project orchestrator.

## What the AI did

- **Pre-implementation survey** — read `app/actions/communication/communication-actions.ts` and discovered the SMS branch at line 56 called `SMSService.sendOrderConfirmationSMS` directly, bypassing the user's `communicationPreferences.sms` flag. REQ-054 had routed WhatsApp + email through NotificationService but left SMS on the bypass path. Identified `lib/email.ts:sendOrderConfirmationEmail` for itemization extension. Found the Reorder stub at `orders/history/page.tsx:155-157`. Confirmed `/contact` is referenced but doesn't exist (footer link commented out at `footer.tsx:16`; order-details page links to `/contact` and 404s).
- **Authored** `compliance/plans/REQ-062/implementation-plan.md` with 6 ACs, technical approach, STRIDE table, rollback. Flagged the **behavioural change** in AC1 honestly — customers without `cp.sms === true` (most of the base, since default is false) will stop receiving SMS confirmations after the fix.
- **Operator approved the plan** at the LOW-MEDIUM risk gate per `feedback_sdlc_impl_plan_review`, accepting the behavioural change.
- **TDD red baselines** — wrote 3 tests across 2 files before production code: 2 consent-gate cases (SMS routed through NotificationService; guest path safe) + 1 receipt-itemization case (HTML body contains the new field labels + payment method value). Deferred component tests for ReorderButton + `/contact` to manual UAT per the test-scope.
- **Implementation order**:
  - `lib/email.ts` — extended `sendOrderConfirmationEmail` signature with 7 optional fields; added the breakdown table HTML between items and total; conditional rendering so unspecified fields are skipped.
  - `app/actions/communication/communication-actions.ts` — collapsed the SMS-direct + email-via-NotificationService branches into a single unified `NotificationService.send` call with all three channel closures (whatsapp/email/sms). Closes the SMS bypass cleanly.
  - `components/features/orders/reorder-button.tsx` (new) — client component with clearCart + addItem loop + router.push + toast. v1 naïve add (defaults `category=''` / `preparationTime=0` because order items don't carry those).
  - `app/(customer)/orders/history/page.tsx` — swapped the stub `<Button>Reorder</Button>` for `<ReorderButton order={order} />`.
  - `app/(customer)/contact/page.tsx` (new) — server component renders hours from SettingsService, phone (tel: + WhatsApp wa.me), email mailto, embedded `<SupportForm />`.
  - `components/shared/navigation/footer.tsx` — uncommented the `/contact` entry.
- **One type-error round-trip** — initial ReorderButton mapped customizations to the wrong shape (`customizationId/customizationName/optionId/optionName/priceModifier`) instead of the actual `SelectedCustomization` shape (`name/option/price`). tsc caught it; passed `item.customizations` through directly (the order-item snapshot already matches the cart-store's expected shape). Single-edit fix.
- **One commit-msg round-trip** — first attempt's header was 107 characters (limit: 100). Shortened from `feat(orders,checkout,contact): customer trust polish — sms consent + receipt + reorder + /contact [REQ-062]` to `feat(orders,checkout,contact): customer trust polish bundle [REQ-062]`. Same shape as REQ-057's "uppercase IG" fix — commit-msg hook catches it before push.
- **Gates** — full vitest 1039 / 4 skip / 0 fail (+3 from REQ-061 baseline of 1036); tsc 0 errors; eslint 0 errors on 6 changed files; semgrep ERROR-severity 0 findings on 4 source files; npm audit 0 high/critical.
- **Commit + push + PR #260** — `feat(orders,checkout,contact): customer trust polish bundle [REQ-062]`. Note: PR #259 (devaudit 0.1.33 sync — audit-log export in CI) merged ~17s before mine; its CI Pipeline run was cancelled by the concurrency rule. Cancellation is benign: develop tip includes both, REQ-062's CI run re-evaluates the combined tip, and the new audit-log export step from #259 exercises on the next compliance-evidence.yml run (which is this Phase 3 evidence pack push).
- **Phase 3 evidence pack assembled BEFORE the release PR** per `feedback_phase3_release_ticket_mandatory` — sixth consecutive cycle applying this lesson (REQ-057 → REQ-058 → REQ-059 → REQ-060 → REQ-061 → REQ-062).
- **Updated** `compliance/RTM.md` with the REQ-062 row.

## What the human did

- Picked Bundle A (P0 #5 + P1 #6/#9/#11) as REQ-062 after I recommended it as highest-impact-per-cost.
- Approved the plan at the LOW-MEDIUM-risk gate, including the AC1 behavioural-change acknowledgment.
- Merged the integration PR #260.
- Asked about PR #259's cancelled CI run (answered: benign per concurrency rule).
- Will perform Phase 4 portal UAT approval + Phase 5 Production approval after CI green on develop.

## Risk-tier compliance

- LOW-MEDIUM risk → plan approval offered + granted before any code was written (matches `feedback_sdlc_impl_plan_review`).
- Tests written before implementation per `feedback_tests_before_push`.
- All gates run locally before push per `feedback_wait_for_ci`.
- Single bundled PR per `feedback_single_pr_default` (production + RTM + plan + tests in PR #260; evidence pack in PR #261 per Phase 3 sequencing).
- E2E policy honoured per `project_e2e_targeted_until_117` — no full regression dispatched.
- Phase 3 evidence pack lands BEFORE release PR per `feedback_phase3_release_ticket_mandatory`.
- No `--no-verify`. PR titles use `[REQ-XXX]` brackets per `feedback_pr_title_req_brackets`.

## Cycle hygiene — sixth consecutive clean cycle

REQ-057 → REQ-058 → REQ-059 → REQ-060 → REQ-061 → REQ-062. Same shape every time:

- Plan approval before coding (when risk warrants).
- TDD red baseline before production code.
- Phase 3 BEFORE release PR.
- Clean `[REQ-XXX]` step-3 attribution.
- One commit-msg or type-error round-trip per cycle, fixed inline.

## Decision points worth recording

- **Bundle scope** — kept P0 #5 in the bundle despite the behavioural change. The alternative (defer to a separate REQ) would have shipped 3 polish items + left the consent gap open; bundling let us close the gap in the same trust-polish cycle. Operator approved at plan time.
- **Routing all three channels through NotificationService** — closed the SMS-direct bypass AND made the action consistent with the WhatsApp consent posture REQ-054 introduced. Previously the action had two paths (SMS direct, WhatsApp+email via NotificationService); now it has one (all three via NotificationService).
- **Email itemization fields all optional** — backwards-compat. Existing callers that don't pass the new fields still render correctly. No downstream caller update needed.
- **ReorderButton v1 naïve add** — supplies sensible defaults for category/preparationTime since order-item snapshots don't carry those fields. The customer's cart view + checkout flow does its own validation. v2 menu-state resolution is a future REQ.
- **No component test for ReorderButton or `/contact`** — Next.js server-component RTL + Zustand + router boundary is high-effort for low-return on these surfaces (small components, single click handlers, server-rendered with no client interaction beyond a dialog). Manual UAT covers them; documented in test-scope as out-of-scope.
- **`/contact` page uses WhatsApp wa.me as "recommended"** — matches the project's strategic direction that WhatsApp is the primary customer comms channel. tel: + mailto: are secondary options.
- **Footer `/contact` link uncommented** — wasn't part of the AC4 plan but is the obvious last-mile fix. The link's been commented out with a TODO; with REQ-062 the page exists, so the link goes live.
