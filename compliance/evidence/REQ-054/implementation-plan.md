# REQ-054 — `NotificationService.send()` channel-fallback wrapper

**Requirement ID:** REQ-054
**Risk Level:** MEDIUM
**GitHub Issue:** [#117 WA-2](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Context

Customer-facing transactional sends go directly to channel helpers today: `lib/email.ts:sendOrderConfirmationEmail` is called from `app/actions/communication/communication-actions.ts:80`; `lib/sms.ts:SMSService.send*` and `lib/whatsapp.ts:WhatsAppService.send*` exist as siblings but the direct WA helpers aren't called from any user path. There's no orchestration layer, and `User.preferences.communicationPreferences` (just extended in REQ-053 with `whatsappTransactional` / `whatsappMarketing`) is read by nothing.

WA-2 from #117 builds the missing layer: **`NotificationService.send()`** — one entry point per transactional touch, consent-gated, channel-fallback (WhatsApp → email → SMS), template-aware. After this lands, REQ-053's consent fields actually steer outbound traffic; the WhatsApp templates submitted in WA-1 actually get used; and the orchestrator becomes the single place future channels (push, in-app) plug into.

## Acceptance criteria

1. **AC1 — service entry point** — New `services/notification-service.ts:NotificationService.send(opts)` where `opts` carries the user id, the template key, the message category (or implicit from the template-name map), and per-channel payloads (`whatsapp`, `email`, `sms`). Returns `{ sentVia: 'whatsapp' | 'email' | 'sms' | 'none', success: boolean, attempts: Attempt[] }`.

   ```ts
   interface SendOptions {
     userId: string;
     templateKey: string; // e.g. 'order_confirmation'
     category?: 'transactional' | 'marketing' | 'authentication';
     whatsapp?: { params: string[] }; // omit to skip channel
     email?: () => Promise<void>; // closure — caller controls content
     sms?: () => Promise<{ success: boolean; message?: string }>;
   }
   ```

   Caller controls each channel's content via the closures / params shape; orchestrator only routes.

2. **AC2 — template category map** — `lib/notification-templates.ts` exports `TEMPLATE_CATEGORIES` — a string→category record for every template listed in `docs/whatsapp-templates.md` (12 user-facing + `verification_pin`). `send()` looks up `templateKey` to get the category unless `opts.category` overrides it. Unknown templateKey throws a clear error (no silent send).

3. **AC3 — consent gating** — Per category, check `user.preferences.communicationPreferences`:
   - `transactional` → `whatsappTransactional` (default `true`)
   - `marketing` → `whatsappMarketing` (default `false`)
   - `authentication` → no consent check (OTP is exempt per Meta policy)
   - Email gated by the single `email` boolean; SMS by `sms`. The single email/sms booleans aren't split into marketing/transactional in REQ-053's schema; v1 of REQ-054 treats them as binary across both intents. Future tightening can split.

4. **AC4 — channel order + fallback** — Try WhatsApp first (if `opts.whatsapp` passed AND consent OK AND `ENABLE_WHATSAPP_NOTIFICATIONS === 'true'`). If WA returns failure OR consent blocked, try email next (if `opts.email` closure passed AND `email` consent OK). If that also fails or is skipped, try SMS (if `opts.sms` closure passed AND `sms` consent OK). **First success wins; stop.** If all skipped or failed, return `sentVia: 'none'` and log a warning.

5. **AC5 — backwards-compat** — When `ENABLE_WHATSAPP_NOTIFICATIONS !== 'true'` (current prod) OR Meta template not yet approved (WA send returns `errorCode: 'TEMPLATE_NOT_FOUND'`), the WhatsApp attempt fails fast and email path fires immediately — **same UX as today**.

6. **AC6 — caller refactor** — Replace the single direct-email site at `app/actions/communication/communication-actions.ts:80`:

   ```diff
   - await sendOrderConfirmationEmail(email, {...orderData});
   + await NotificationService.send({
   +   userId: order.userId ?? null,  // guest path — falls back to email closure
   +   templateKey: 'order_confirmation',
   +   whatsapp: order.userId ? { params: [...] } : undefined,
   +   email: () => sendOrderConfirmationEmail(email, {...orderData}),
   + });
   ```

   Other current callers (`sendVerificationPinEmail`, `SMSService.sendVerificationPinSMS`, `sendOrderConfirmationSMS`) stay on the existing direct path — they don't fit the multi-channel orchestration cleanly (`verification_pin` is per-channel-by-method already, `sendOrderConfirmationSMS` isn't currently wired).

7. **AC7 — observability v1** — Each attempt logged via `console.log` with structured fields `{ event: 'notification.attempt', userId, templateKey, channel, success, durationMs }`. Persistent `NotificationLog` model **deferred to WA-5**.

## Technical approach

### 1. `lib/notification-templates.ts` (new, ~40 LOC)

```ts
export type NotificationCategory =
  | 'transactional'
  | 'marketing'
  | 'authentication';

export const TEMPLATE_CATEGORIES: Record<string, NotificationCategory> = {
  // Authentication (already approved upstream; no consent check)
  verification_pin: 'authentication',
  // Transactional (UTILITY per Meta)
  order_confirmation: 'transactional',
  order_status_update: 'transactional',
  receipt: 'transactional',
  payment_link: 'transactional',
  payment_confirmation: 'transactional',
  bank_transfer_details: 'transactional',
  support_reply: 'transactional',
  welcome_new_user: 'transactional',
  welcome_back: 'transactional',
  account_recovery: 'transactional',
  // Marketing (require `whatsappMarketing` consent)
  reward_earned: 'marketing',
  reward_expiring_soon: 'marketing',
};
```

### 2. `services/notification-service.ts` (new, ~120 LOC)

- `send(opts)` orchestrator
- private helpers `tryWhatsApp(opts, user)`, `tryEmail(opts, user)`, `trySMS(opts, user)`
- `shouldSendWhatsApp(user, category)` → boolean (consent + enabled)
- `shouldSendEmail(user)`, `shouldSendSMS(user)` → boolean (consent)
- All channel attempts wrap in try/catch and append to `attempts`. Stops at first `success: true`.
- Imports: existing `WhatsAppService` from `lib/whatsapp.ts`, `UserModel` from `@/models`, `TEMPLATE_CATEGORIES` from `@/lib/notification-templates`.

### 3. Caller refactor in `app/actions/communication/communication-actions.ts:80`

- One-line swap to `NotificationService.send`. Existing settings-channel gating (`settings.channels.orders === 'email'`, etc.) stays as the OUTER gate — admin can still globally disable a channel; consent is the per-user gate INSIDE the service.

### 4. No new packages, no new env vars

`ENABLE_WHATSAPP_NOTIFICATIONS` already exists and is read by `WhatsAppService.isEnabled`. NotificationService doesn't add its own kill-switch — if WA is globally disabled the existing `isEnabled` check short-circuits the WA attempt.

## Tests (TDD — written before implementation)

`__tests__/services/notification-service.test.ts` (~10 cases, all vitest with mocked UserModel + WhatsAppService):

1. **All channels opted in + WA enabled** → WhatsApp wins; email + SMS closures never called
2. **Only email opted in** (`whatsappTransactional: false, email: true, sms: false`) → WA skipped on consent; email closure called and succeeds; SMS never called
3. **All opted out for transactional template** → `sentVia: 'none'`, no closure called, warning logged
4. **Marketing template + `whatsappMarketing: false` but `email: true`** → email closure fires (marketing email allowed under v1's single-boolean email gate)
5. **Authentication template (`verification_pin`)** → ignores user consent flags, attempts WhatsApp regardless (OTP exemption)
6. **WhatsApp returns failure (`errorCode: 'TEMPLATE_NOT_FOUND'`)** → email closure fallback fires, returns `sentVia: 'email'`
7. **Unknown templateKey** → throws a clear error before any send attempt
8. **`opts.category` override** → overrides the map lookup (test: pass `templateKey: 'order_confirmation'` with `category: 'marketing'` and assert the marketing consent path is checked)
9. **`opts.whatsapp` omitted entirely** → channel skipped without consent check (closure-presence-is-the-gate)
10. **All closures provided + WA fails + email throws** → falls through to SMS, returns its result

`__tests__/lib/notification-templates.test.ts` (~3 cases):

- Every key in the map maps to a valid category
- Lookup returns the right category for a known key
- Lookup returns `undefined` for an unknown key (caller must handle)

## Dependencies

- **REQ-053** — schema fields `whatsappTransactional` + `whatsappMarketing`. ✅ Released 2026-05-31.
- **WA-1 templates** — for the WhatsApp path to actually succeed against Meta, templates must be approved. Until then, `WhatsAppService.sendMessage` returns `TEMPLATE_NOT_FOUND` and the email fallback fires. **REQ-054 ships safely without WA-1 — the worst case is "behaves like today."**
- **No new packages, no env vars.**

## Security considerations

### STRIDE

| Cat                     | Risk                                                                                                     | Mitigation                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No auth surface change                                                                                   | —                                                                                                       |
| **T** — Tampering       | The `opts.category` override could be misused to send a marketing template under `transactional` consent | AC2: default is the map lookup; override is documented as power-caller affordance; tests cover the path |
| **R** — Repudiation     | Each send `console.log`'d v1                                                                             | WA-5 adds the persistent audit trail                                                                    |
| **I** — Info disclosure | Phone / email visible to admins already                                                                  | —                                                                                                       |
| **D** — DoS             | Per-call cost: 1 user fetch + ≤3 channel attempts. Bounded                                               | —                                                                                                       |
| **E** — Elevation       | No role/permission change                                                                                | —                                                                                                       |

### Privacy / regulatory

- Meta WhatsApp Business Policy compliance: marketing templates only fire when `whatsappMarketing === true`. Transactional templates only fire when `whatsappTransactional === true`. AC3 enforcement.
- Email + SMS keep their single-boolean consent for v1; tightening to marketing/transactional split for those channels is a future REQ when the data justifies it.

### Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Rollback plan

1. Single PR. `git revert <merge-sha>` restores the prior `communication-actions.ts:80` direct-email call. `services/notification-service.ts` and `lib/notification-templates.ts` remain in the codebase but un-called from any user path. No data loss; no schema change.
2. No DB migration; no schema change.
3. Detection: `console.log` output stops carrying the `event: 'notification.attempt'` lines; order-confirmation behaviour reverts to email-only.

## Test scope

| Gate                            | Expected                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `npx tsc --noEmit`              | exit 0                                                                         |
| `npx vitest run`                | 0 failures; new tests pass; existing suite unchanged                           |
| `npx eslint <changed>`          | 0 errors                                                                       |
| `semgrep scan --severity ERROR` | 0 new findings on REQ-054 code                                                 |
| `npm audit --audit-level=high`  | 0 high/critical                                                                |
| E2E focused                     | n/a — no e2e spec added (server-action surface; unit boundary is load-bearing) |

## Out of scope (explicit list)

- **`NotificationLog` persistent model + delivery-status webhook handling** → WA-5
- **Rewards-earned + rewards-expiring email refactor** → naturally adopted by NotificationService once those template paths are touched in WA-6 work; v1 of REQ-054 leaves them alone
- **Support-reply path** → WA-3 owns inbound; outbound is trivially `NotificationService.send` once needed
- **Per-channel marketing/transactional split for email + SMS** → future REQ once we have data
- **Caller refactors beyond `order_confirmation`** → other senders stay on direct-channel paths; NotificationService is opt-in for v1

## Plan deviation log

(populated during implementation if anything diverges from the above)
