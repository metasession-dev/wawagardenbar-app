# REQ-062 — Test plan

**Requirement ID:** REQ-062
**Risk:** LOW-MEDIUM
**Related issue:** [#117 P0 #5 + P1 #6 + P1 #9 + P1 #11](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-02

## Acceptance criteria → tests

| AC  | Statement                                                                                                                                                    | Test                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | SMS consent gate — `sendOrderConfirmationAction` routes SMS through `NotificationService.send` so the existing `shouldSendSMS` (cp.sms === true) check fires | `__tests__/actions/communication.consent-gate.test.ts` — 2 cases (NotificationService called with `sms` closure; SMSService direct call NOT made; guest path safe)                |
| AC2 | Receipt itemization — `sendOrderConfirmationEmail` renders subtotal/serviceFee/deliveryFee/tax/tip/pointsEarned/paymentMethod when present                   | `__tests__/lib/email-receipt.test.ts` — 1 case (assert each new label appears in the rendered HTML)                                                                               |
| AC3 | Reorder button works — `<ReorderButton order={order} />` clears cart, adds historical items, navigates to /cart                                              | Manual UAT verification — small client component, single click handler, failure modes visually obvious                                                                            |
| AC4 | `/contact` page exists — renders hours, phone (tel: + WhatsApp wa.me), email mailto, SupportForm                                                             | Manual UAT verification — server-component + dialog form pattern                                                                                                                  |
| AC5 | All-passing tests + no regression                                                                                                                            | Full vitest suite — 1039 pass / 4 skip / 0 fail (+3 from REQ-061 baseline of 1036)                                                                                                |
| AC6 | Backwards-compat preserved                                                                                                                                   | Email itemization fields all optional — existing callers that don't pass them render correctly; cart-store invocation in ReorderButton uses defaults for category/preparationTime |

## Test environment

- **Unit**: vitest 4.1.x. `@/services` mocked at the import boundary (OrderService, SystemSettingsService); `@/models` mocked for UserModel.findById; `@/lib/email` mocked; `@/lib/sms` mocked (SMSService); `@/services/notification-service` mocked. `nodemailer` mocked at module level for the email test so `createTransport().sendMail()` is observable.
- **No component test for ReorderButton or `/contact`** — Next.js server-component RTL + Zustand + router boundary testing is non-trivial; manual UAT covers.
- **No E2E** — checkout/email/contact surfaces; unit + manual-UAT boundary is load-bearing. Honours `project_e2e_targeted_until_117` policy.

## Quality gates

| Gate                                                                  | Expected                                           | Actual (2026-06-02)                                                                                                                                                                                                            |
| --------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`                                                    | exit 0                                             | exit 0                                                                                                                                                                                                                         |
| `npx vitest run` (full)                                               | 0 failures                                         | 1039 pass / 4 skip / 0 fail                                                                                                                                                                                                    |
| `npx vitest run __tests__/actions/communication.consent-gate.test.ts` | 2 pass                                             | 2 pass                                                                                                                                                                                                                         |
| `npx vitest run __tests__/lib/email-receipt.test.ts`                  | 1 pass                                             | 1 pass                                                                                                                                                                                                                         |
| `npx eslint <changed>`                                                | 0 errors                                           | 0 errors                                                                                                                                                                                                                       |
| `semgrep scan --severity=ERROR <changed>`                             | 0 findings                                         | 0 findings                                                                                                                                                                                                                     |
| `npm audit --audit-level=high`                                        | 0 high/critical                                    | 0 high / 0 critical                                                                                                                                                                                                            |
| Develop CI Pipeline (post-merge)                                      | All 3 jobs PASS, attributed to `--release REQ-062` | run [26827879310](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26827879310) — `Release version: REQ-062` clean step-3 attribution; Quality Gates + Upload Evidence + Compliance Evidence Upload all green |

## Test data

- Synthetic order via `defaultOrder()` factory: orderNumber `WGB-001`, `pickup` orderType, single Burger item ₦5000, total ₦5100, paymentMethod `card`, pointsEarned 51, guestPhone/Email.
- Mocked `sendMail` return: `{ messageId: 'm1' }`.
- SMTP env vars set in test setup (`SMTP_HOST/PORT/USER/PASS`) so the email module's transport-init doesn't bail.

## Sequencing

1. Unit gate runs locally + on CI per push.
2. E2E not dispatched — `project_e2e_targeted_until_117` policy + scope justification.
3. Phase 3 evidence pack (this bundle) lands on develop BEFORE the release PR per `feedback_phase3_release_ticket_mandatory` — sixth consecutive cycle applying this lesson.
4. Release PR `develop → main` aggregates the CI evidence under `REQ-062`.

## Rollback signal

The four trust gates disappear; SMS direct send returns (default-no-consent regression — actually a re-regression to pre-REQ-062 behaviour); email reverts to minimal layout; reorder button becomes a stub; `/contact` 404s again. No data loss.

## Manual UAT plan (load-bearing for AC3 + AC4)

- Sign in as a customer who has opted out of SMS (`cp.sms = false`) → place a pickup order → confirm receiving email but NO SMS. Sign in with `cp.sms = true` → confirm receiving SMS too.
- Open the order email → verify itemized breakdown table renders with subtotal, service fee, tax (if enabled), tip (if any), payment method, points earned.
- Order history → click "Reorder" on a completed order → verify cart populates + navigates to /cart + toast shows.
- Visit `/contact` → verify hours render from settings + WhatsApp wa.me link opens conversation + tel: link triggers call dialer + mailto: opens email client + "File a support ticket" button opens the SupportForm dialog.
