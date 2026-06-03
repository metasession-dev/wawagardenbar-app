# REQ-063 — Bundle B (comms hardening / explicit-consent split)

**Status:** IN PROGRESS · **Risk:** MEDIUM · **Issue:** #117 P4 #21 (and tail of WA-4)

## Context

REQ-053 (RELEASED 2026-05-31) shipped WA-4: it added `whatsappTransactional` (default `true`) and `whatsappMarketing` (default `false`) to the User `communicationPreferences` schema, surfaced a PIN-entry checkbox, and added two switches to the profile preferences-tab.

In practice the PIN-entry checkbox is a **single** `whatsappOptIn` boolean that, in `components/shared/auth/login-form.tsx:225–227`, sets _both_ `whatsappTransactional` and `whatsappMarketing` to the same value. That conflates two consents the schema already separates — and is the explicit gap #117 P4 #21 names.

Separately, the schema's `email: boolean` does not distinguish marketing email from transactional email, so a user opting out of marketing emails today would also lose their order-confirmation emails. P4 #21 asks for `email marketing (default off)` as a third explicit checkbox.

## Acceptance criteria

1. **AC1 — 3-checkbox PIN-verify.** The new-user PIN-entry surface renders **three** distinct checkboxes: WhatsApp transactional (default checked), WhatsApp marketing (default unchecked), email marketing (default unchecked). Wording: "Order updates via WhatsApp (recommended)" / "Offers and promotions via WhatsApp" / "Offers and promotions by email".
2. **AC2 — `emailMarketing` field.** `IPreferences.communicationPreferences.emailMarketing: boolean` exists, schema default `false`, backwards-compatible via Mongoose default-fill (no migration required).
3. **AC3 — audit timestamp.** `IPreferences.communicationPreferencesUpdatedAt?: Date` is set whenever any communication preference changes — at PIN first-verify (when persisting the opt-in payload) and on `updatePreferencesAction` save. Single timestamp; not a per-field event log (operator decision recorded 2026-06-03).
4. **AC4 — NotificationService email-marketing gate.** When `NotificationService.send` resolves a template to the email channel and the template's category is `marketing`, the send is blocked unless `communicationPreferences.emailMarketing === true`. Transactional + authentication categories pass through (unchanged).
5. **AC5 — Profile toggle.** The profile preferences-tab `<PreferencesTab />` gains an "Offers and promotions by email" toggle wired into the same `updatePreferencesAction`.

## Technical approach

### Schema (1 file)

`interfaces/user.interface.ts` + `models/user-model.ts`: add `emailMarketing: boolean` (default `false`) and `communicationPreferencesUpdatedAt?: Date` to the preferences shape. Both fields are optional from a backwards-compat angle (Mongoose default-fills `emailMarketing`; the timestamp simply stays unset on pre-REQ-063 users).

### PIN-verify wiring (2 files)

- `app/actions/auth/verify-pin.ts`, `verify-whatsapp-pin.ts`, `verify-email-pin.ts`: extend the `PinOptInPayload` type with two more booleans (`whatsappMarketing` was always there but the client wasn't passing it independently; add `emailMarketing`). Persist all three independently when `!user.phoneVerified && !user.emailVerified`. Stamp `communicationPreferencesUpdatedAt = new Date()` in the same set.
- `components/shared/auth/login-form.tsx`: split the single `whatsappOptIn` state into three `useState<boolean>` slots (`waTransactional` default `true`, `waMarketing` default `false`, `emailMarketing` default `false`). Render three `<Checkbox>` rows in the `isNewUser` block (lines 582+). Build the `optInPayload` from the three independent values.

### NotificationService gate (1 file)

`services/notification-service.ts`: when the email channel is the selected route AND `TEMPLATE_CATEGORIES[templateKey] === 'marketing'`, check `user.preferences.communicationPreferences.emailMarketing === true` before invoking the email send closure. Mirrors the existing WhatsApp transactional/marketing gating pattern. Already-wired transactional sends unchanged.

### Profile tab (1 file)

`components/features/profile/preferences-tab.tsx`: add `emailMarketing` to the Zod schema, `defaultValues`, and render a `<Switch>` row below the existing email/sms/push group with a `<Separator>` between transactional and marketing sections.

### Audit timestamp wiring (2 files)

`app/actions/profile/profile-actions.ts:updatePreferencesAction`: stamp `communicationPreferencesUpdatedAt = new Date()` on the same set as the prefs update. Already covered by the PIN-verify path above.

## Risk

**MEDIUM.** Touches the auth-adjacent first-verify flow + customer consent state. Existing users whose `whatsappMarketing` was set to `true` by REQ-053's single-checkbox bug **are left alone** (their data is their explicit click as far as they're concerned; flipping it now would feel hostile). New users from REQ-063 forward have correct three-way consent.

## Security considerations

- The `optInPayload` is unauthenticated until PIN succeeds; persistence only happens after `verifyPin` confirms the OTP, mirroring REQ-053. No new attack surface.
- The marketing-email gate is server-side in `NotificationService` — a forged client payload cannot bypass the gate.
- `communicationPreferencesUpdatedAt` is server-stamped (never client-supplied). Prevents replay-style backdating.

## Dependencies

- REQ-053 (RELEASED) — provides the existing PIN-entry pattern, schema fields, and profile UI we're extending.
- REQ-054 (RELEASED) — provides `NotificationService.send` + `TEMPLATE_CATEGORIES`; the gate plugs into the existing email branch.

## Test scope

Vitest cases:

1. `user-model.preferences.test.ts` — `emailMarketing` default `false`; `communicationPreferencesUpdatedAt` accepts `Date`.
2. `verify-pin.test.ts` — first verify with `{ whatsappTransactional, whatsappMarketing, emailMarketing }` persists all three + stamps timestamp.
3. `verify-pin.test.ts` — second verify with `phoneVerified: true` does NOT overwrite (mirrors REQ-053 contract).
4. `notification-service.email-marketing-gate.test.ts` — email send of a `marketing`-category template is blocked when `emailMarketing: false`, passes when `true`, and transactional email always passes.

E2E / component interactive tests for the PIN-entry checkbox group + profile toggle deferred to manual UAT — out of scope for REQ-063 per `project_e2e_targeted_until_117`.

## Plan deviation

_(to be filled if implementation requires divergence)_
