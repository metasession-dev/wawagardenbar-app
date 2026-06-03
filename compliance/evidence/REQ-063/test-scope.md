# REQ-063 — Test scope

## In scope (unit)

- Schema-level validation that `emailMarketing` defaults to `false` and accepts overrides.
- Schema-level validation that `communicationPreferencesUpdatedAt` accepts `Date` values.
- Verify-pin action: payload-shape contract (three independent booleans), first-verify-only persistence gate, audit-timestamp stamping.
- NotificationService: email-channel gate split (transactional unchanged, marketing requires `emailMarketing === true`, authentication unchanged).

## Updated coverage (regressions on REQ-053 + REQ-054)

- `__tests__/actions/auth/verify-pin-opt-in.test.ts` — added `emailMarketing` to the three existing payload calls so the type contract matches the new `PinOptInPayload`.
- `__tests__/services/notification-service.test.ts` AC3 + AC2 — flipped the test user's `emailMarketing` to `true` for the two cases that exercise marketing-template → email fallback (the original AC was the channel-fallback path, not the gate-shape).

## Out of scope

- **Component tests for the three-checkbox PIN-entry surface.** Pure UI; the underlying action is unit-tested. Visual + interactive flow covered by manual UAT.
- **Component test for the new "Email — offers & promotions" toggle in profile preferences-tab.** Same rationale — wires already-tested `updatePreferencesAction`.
- **E2E.** Auto-trigger disabled by `project_e2e_targeted_until_117` policy. The next #117-close-out regression cycle will cover the consent surfaces end-to-end.
- **Migration script for existing users.** No migration: Mongoose default-fill supplies `emailMarketing: false` at read-time; the audit timestamp simply remains unset on pre-REQ-063 docs.
- **Backfill for collapsed `whatsappMarketing` from REQ-053.** Deliberate operator decision — flipping users' existing values now would feel hostile; they keep what their last click set.

## Manual UAT — what to check

1. **New user, fresh phone:** request PIN → see three labelled checkboxes ("Order updates via WhatsApp (recommended)" pre-checked, the two marketing rows unchecked). Tick only the email-marketing row, verify, then go to profile → preferences. Email-marketing toggle should be ON; both WhatsApp rows should match the defaults you accepted.
2. **Returning user:** request PIN → no checkboxes should render. The verify call still succeeds; the user's profile-saved preferences are untouched.
3. **Profile → Preferences → flip "Email — offers & promotions" off** → save. Then have an admin trigger a marketing-template email (or the `reward_earned` flow). The email should NOT arrive. Order confirmations should still arrive normally.
4. **Existing user (collapsed REQ-053 consent):** their `whatsappMarketing === true` state from the old single-checkbox is preserved. Operator decision recorded — confirm they still get marketing where their old click implied consent.
