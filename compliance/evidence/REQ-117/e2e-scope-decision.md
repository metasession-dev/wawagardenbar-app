---
req: REQ-117
generated_by: e2e-test-engineer
generated_at: 2026-11-05T00:00:00Z
e2e_required: true
spec_path: e2e/critical/customer-signin-whatsapp-only.spec.ts
---

# E2E scope decision — REQ-117

## Outcome

**E2E required — covered.** A new critical spec drives the real sign-in form against the running server for AC1 to AC5 and AC7 to AC9, and the webhook at the transport boundary for AC10. Six existing specs and two helpers were updated for the phone-only form.

## Detail

- **`e2e_required`:** true.
- **Spec path(s):** `e2e/critical/customer-signin-whatsapp-only.spec.ts` (9 tests: AC1/AC4 checkout round-trip, AC4 anonymous browse, AC2 consent, AC3 not on WhatsApp, AC9 unavailable, AC5 hash and five wrong PINs, AC7 session lifetimes, AC8 legacy account, AC10 no session from the webhook).
- **Updated:** `e2e/customer/auth-pin-happy-path.spec.ts`, `e2e/smoke/customer-auth.spec.ts`, `e2e/customer/auth-guest-flow.spec.ts`, `e2e/smoke/consent-split-pin-entry.spec.ts`, `e2e/critical/customer-pin-six-digits.spec.ts` (no method step), `e2e/smoke/req-084-checkout-separation.spec.ts` (guest banner and guest checkout retired; AC1, AC12 now assert the sign-in redirect; AC2, AC3 run as a signed-in customer), `e2e/requirements-verification.spec.ts` (login form text; checkout tests sign in first), `e2e/smoke/helpers.ts` and `e2e/helpers/customer-auth.ts` (no method click; random phones; `mockSendPinResult`).
- **ACs covered by unit tests only:** AC6 (the purge job is time-based), the PIN request limit of AC5 (five requests per hour, counted on the user document), and the Incident record of AC9.
- **Mocked in the browser, and why:** AC3 and AC9 need a failed Meta send. `ENABLE_E2E_PIN_INTERCEPT=true` returns before Meta is reached, so `mockSendPinResult` rewrites the server action's result line. The real action still runs. The action's own result shapes are unit-tested.
- **Race fixed along the way:** `uniquePhone()` was clock-derived and could repeat across parallel workers; it is now random.
- **Evidence form:** UI specs call `evidenceShot` at the assertion that proves each AC; the AC10 transport check has no `page` and is evidenced by `test-execution-summary.md`.
- **Local run (2026-11-05):** isolated sandbox (disposable `mongo:7`, git worktree of the branch head, dummy payment keys, no `.env.local`), `--project=critical` at the default worker count. First full run: 336 passed, 1 failed, 1 skipped. The failure was `daily-report-business-date-selection.spec.ts` (REQ-095, pinned-clock Today/Yesterday); it passes in isolation and the run passed in full on the second attempt, and nothing in the daily report changed on this branch, so it is classed a flake. Second full run: **337 passed, 0 failed, 1 skipped**. The skip is `close-tab-tip-capture.spec.ts` ("No open tabs to close"), a pre-existing precondition gap in a spec this change does not touch; it is in the existing self-skip follow-up and needs an operator-approved rationale in the summary. Full `regression` was not run locally; CI runs it.
- **Known limit:** `scripts/check-req-title-tags.sh --req REQ-117` passes. Run without `--req` it reports tests of other requirements (REQ-030 to REQ-114) that are titled without their id; not changed here.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** William Thompson
**Date:** 2026-11-05
