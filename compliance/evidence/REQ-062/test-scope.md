# REQ-062 — Test scope

**Requirement:** Customer trust polish — SMS consent gate + receipt itemization + reorder button + `/contact` page (#117 P0 #5 + P1 #6 + P1 #9 + P1 #11).

## In scope

- **Unit (action — SMS consent gate)** — `__tests__/actions/communication.consent-gate.test.ts` (2 cases):
  - `sendOrderConfirmationAction` routes SMS through `NotificationService.send` (with an `sms` closure parameter); `SMSService.sendOrderConfirmationSMS` is no longer called directly.
  - Guest path (no userId) still works; SMS skipped because the consent gate has no user to read.
- **Unit (email — receipt itemization)** — `__tests__/lib/email-receipt.test.ts` (1 case):
  - `sendOrderConfirmationEmail` HTML body contains `Subtotal`, `Service Fee`, `Tax`, `Tip`, `Points Earned`, `Payment Method` (and the actual `card` payment value) when the new fields are passed.
- **Regression** — full vitest suite (1036 → 1039 pass, +3 net, 0 fail).
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --severity=ERROR`, `npm audit --audit-level=high`.

## Out of scope

- **ReorderButton component test** — deferred to manual UAT. The component is small (single click handler → `clearCart` + `addItem` loop + `router.push` + toast); RTL+Zustand+Next-router boundary testing is non-trivial and the failure modes are visually obvious.
- **`/contact` page test** — Next.js server-component RTL is non-trivial; manual UAT covers (visit `/contact`, verify hours render + click-to-WhatsApp + SupportForm dialog opens).
- **WhatsApp receipt template** with the same itemization — blocked by WA-1 at Meta.
- **PDF receipt download** (P1 #7) — separate REQ.
- **Reorder smart-merge** (deleted menu items, customisation conflicts, price changes) — v2 work; v1 is naïve add.
- **Click-to-call mobile UX** beyond `tel:` link — future.
- **E2E checkout flow** — per `project_e2e_targeted_until_117`, deferred to post-#117 regression.

## Risk-based depth

LOW-MEDIUM risk → unit boundary at 3 cases is the load-bearing gate **for the behavioural-change branch**:

- AC1 is the load-bearing one — it changes SMS default for all customers without opt-in. The two consent-gate tests verify the SMS path goes through NotificationService (which has the existing `shouldSendSMS` check tested elsewhere). End-to-end SMS-not-fired-on-cp.sms-false is the implicit consequence of routing through NotificationService — already covered by REQ-054's NotificationService tests.
- AC2's email-itemization test confirms HTML body rendering.
- AC3 + AC4 are non-mutating UI surfaces; failure modes are visually obvious; manual UAT covers them.

The cycle hygiene is preserved: tests-first per `feedback_tests_before_push` (3 red cases confirmed locally before commit), all gates locally before push per `feedback_wait_for_ci`.
