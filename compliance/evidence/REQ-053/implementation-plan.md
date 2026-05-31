# REQ-053 — WhatsApp opt-in surface at signup + profile

**Requirement ID:** REQ-053
**Risk Level:** MEDIUM
**GitHub Issue:** [#117](https://github.com/metasession-dev/wawagardenbar-app/issues/117) WA-4
**Date:** 2026-05-31

## Context

Meta WhatsApp Business Policy requires explicit user opt-in for any non-OTP message. The repo's `lib/whatsapp.ts` already wraps Meta's Cloud API for OTP, but the project's WhatsApp expansion (per #117 strategic direction — "WhatsApp is the primary mode of communication with customers, end-to-end") needs a consent surface in place **before** the templates land (WA-1) and **before** the `NotificationService.send()` helper that respects preferences (WA-2). REQ-053 implements WA-4, the consent layer.

Current state: `IPreferences.communicationPreferences` (interface) and the matching Mongoose sub-schema have three booleans — `email` (default `true`), `sms` (default `false`), `push` (default `false`). No WhatsApp field. Profile UI at `components/features/profile/preferences-tab.tsx` exposes Switches for the three existing channels. The PIN-verification flow in `components/shared/auth/login-form.tsx` collects 4-digit PINs but has no consent surface.

## Acceptance criteria

1. **AC1 — schema** — `IPreferences.communicationPreferences` gains two booleans: `whatsappTransactional` (default `true`) and `whatsappMarketing` (default `false`). Existing fields untouched. Backwards-compatible: pre-REQ-053 user docs without these fields read as the defaults at access time via Mongoose schema defaults; persisted on next save.
2. **AC2 — profile preferences tab** — Two new Switches render in `preferences-tab.tsx` mirroring the existing email/sms/push layout: "WhatsApp — order updates & receipts" (transactional) and "WhatsApp — offers & promotions" (marketing). Form schema + `useForm` defaults updated. Save persists both fields.
3. **AC3 — PIN verification opt-in** — On the PIN-entry step of `login-form.tsx`, **when the user is new** (first verification ever), a single checkbox renders: "Get order updates and offers via WhatsApp — recommended" (default `checked`). Checked → both `whatsappTransactional` and `whatsappMarketing` set to `true`. Unchecked → both `false`. Hidden for returning users.
4. **AC4 — verify-pin actions persist on first verify only** — `verifyPinAction`, `verifyEmailPinAction`, `verifyWhatsAppPinAction` accept an optional `optIn: { whatsappTransactional: boolean; whatsappMarketing: boolean }` payload. Persisted on the user doc **only when `user.phoneVerified === false`** before the verify call (i.e. first verification). Subsequent verifies ignore the payload, preserving the user's profile-set preferences.
5. **AC5 — send-pin actions report new-user flag** — `sendPinAction`, `sendEmailPinAction`, `sendWhatsAppPinAction` return `isNewUser: boolean` (new optional field on the return shape) so the client can decide whether to show the opt-in checkbox.
6. **AC6 — backwards compatibility** — Existing callers of verify-pin that don't pass `optIn` continue to work (no schema validation error). Existing user docs without `whatsappTransactional`/`whatsappMarketing` fields read as `true`/`false` via defaults; profile UI renders the right state.

## Technical approach

### 1. Schema & interface (~8 LOC)

```diff
// interfaces/user.interface.ts
 communicationPreferences: {
   email: boolean;
   sms: boolean;
   push: boolean;
+  whatsappTransactional: boolean;
+  whatsappMarketing: boolean;
 };
```

```diff
// models/user-model.ts (preferencesSchema)
 communicationPreferences: {
   email: { type: Boolean, default: true },
   sms: { type: Boolean, default: false },
   push: { type: Boolean, default: false },
+  whatsappTransactional: { type: Boolean, default: true },
+  whatsappMarketing: { type: Boolean, default: false },
 },
```

No migration script — Mongoose defaults fill in at read time; persisted on next user-doc save.

### 2. Send-pin actions return `isNewUser`

Three actions: `app/actions/auth/send-pin.ts`, `send-whatsapp-pin.ts`, `send-email-pin.ts`. Each does a `findOne` then `create` if absent. Capture whether `create` was called and return as `isNewUser`. ~3 LOC change each.

### 3. Verify-pin actions accept opt-in payload

Three actions: `verify-pin.ts`, `verify-whatsapp-pin.ts`, `verify-email-pin.ts`. New optional 3rd param `optIn?`. Persist only when `!user.phoneVerified` (first verify). ~10 LOC each.

### 4. Login form UI (~50 LOC)

`components/shared/auth/login-form.tsx`:

- Track `isNewUser` state, set from the send-pin response.
- In the PIN-entry step, render a checkbox (default checked) when `isNewUser === true`.
- Pass `optIn` payload to verify-pin actions.

### 5. Profile preferences tab (~50 LOC)

`components/features/profile/preferences-tab.tsx`:

- Extend zod form schema with both fields.
- Add two `<Switch>` rows mirroring email/sms/push.
- Default form values include both new fields.

### 6. Profile save action

Wherever `preferences-tab` posts — likely `app/actions/profile/profile-actions.ts`. Confirm the action passes the full `communicationPreferences` object through; if it does, no change. If it whitelists fields, add the two new keys.

## Tests (TDD — written before implementation)

### Unit

- `__tests__/models/user-model.preferences.test.ts` (new) — defaults: a brand-new User doc has `communicationPreferences.whatsappTransactional === true` and `whatsappMarketing === false`. Backwards-compat: a User doc constructed without the field reads the defaults.
- `__tests__/actions/auth/verify-pin-opt-in.test.ts` (new) — covers all 3 verify actions:
  - **First verify** (`phoneVerified === false`): `optIn` is persisted to `communicationPreferences`.
  - **Subsequent verify** (`phoneVerified === true`): `optIn` payload is ignored; existing preferences preserved.
  - **No `optIn` argument**: action runs unchanged (backwards-compat).
- `__tests__/actions/auth/send-pin-is-new-user.test.ts` (new) — covers all 3 send actions: returns `isNewUser: true` for a phone that didn't exist; `isNewUser: false` for an existing one.

### Component

- `__tests__/components/profile/preferences-tab.whatsapp.test.tsx` (new) — renders the two new Switches; clicking toggles state; save action receives the right payload.

### E2E focused (one spec)

- `e2e/auth/whatsapp-opt-in.spec.ts` (new) — flow: signup (new phone via WhatsApp method) → PIN-entry checkbox visible + default checked → uncheck marketing portion (NOTE: AC3 ties them together; revisit if AC3 split into two checkboxes) → verify → log in → navigate to profile → both WhatsApp Switches OFF (because we unchecked). Re-toggle in profile, save, reload, assert persisted.

Single spec; uses Playwright with auth.setup admin storage state via the existing customer-PIN-login pattern (note: customer PIN tests need provider mocks per `e2e_regression_suite` memory — verify locally that the spec doesn't trip the server-side fatal sends).

## Dependencies

- **No new packages.**
- No new env vars.
- `lib/whatsapp.ts` not modified (it's outbound-only today; REQ-053 only writes consent state).
- No database migration; Mongoose defaults handle existing docs.

## Security considerations

### STRIDE

| Cat                       | Risk                                                                                                                                                                                                                                               | Mitigation                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **S** (Spoofing)          | None — no auth-surface change.                                                                                                                                                                                                                     | —                                          |
| **T** (Tampering)         | A malicious client could send an `optIn` payload on a subsequent verify, but the backend gates persistence on `!user.phoneVerified`. After first verify it's a no-op. Profile-level changes still require a session and post the user's own `_id`. | AC4 backend-side gate; preserved by tests. |
| **R** (Repudiation)       | Consent state is persistable; audit trail piggybacks on existing `User.updatedAt` + any preferences-change-history infrastructure.                                                                                                                 | Same as existing email/sms/push prefs.     |
| **I** (Info disclosure)   | Communication-preference state is visible only to the user + admins, same as existing email/sms/push fields.                                                                                                                                       | —                                          |
| **D** (Denial of service) | No new endpoint; no extra DB calls vs existing verify-pin path.                                                                                                                                                                                    | —                                          |
| **E** (Elevation)         | None.                                                                                                                                                                                                                                              | —                                          |

### Privacy / regulatory

- Nigeria's NDPR does not require explicit consent for service-related (transactional) comms; Meta WhatsApp Business Policy does for non-OTP messages. The opt-in checkbox satisfies Meta's requirement for both transactional templates and marketing templates by default.
- Marketing opt-out default (`false`) matches the safer-by-default principle if anyone overlooks the checkbox state.

### Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation — see DevAudit-Installer#89 gap 10).

## Rollback plan

1. Single PR; `git revert <merge-sha>` restores prior schema + UI atomically. Mongoose docs that had been written with the new fields keep them in DB (extra fields are harmless); app stops reading/writing them. No data loss.
2. No DB migration to roll back.
3. Detection: WhatsApp opt-in checkbox disappears from PIN flow + Switches gone from profile.

## Test scope

| Gate                                    | Expected                                                  |
| --------------------------------------- | --------------------------------------------------------- |
| `npx tsc --noEmit`                      | exit 0                                                    |
| `npx vitest run`                        | 0 failures; new unit tests pass; existing suite unchanged |
| `npx eslint <changed>`                  | 0 errors                                                  |
| `semgrep scan --severity ERROR`         | 0 new findings on REQ-053 code                            |
| `npm audit --audit-level=high`          | 0 high/critical                                           |
| E2E focused (`whatsapp-opt-in.spec.ts`) | spec passes                                               |
| E2E full regression                     | net failures: no new red                                  |

## Plan deviation log

(populated during implementation if anything diverges from the above)
