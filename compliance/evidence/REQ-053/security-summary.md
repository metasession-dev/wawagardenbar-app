# REQ-053 — Security summary

**Requirement ID:** REQ-053
**Risk class:** MEDIUM
**Surface:** WhatsApp opt-in checkbox at PIN-entry; new schema fields; profile preferences Switches.

## STRIDE assessment

| Category                | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No               | No auth-surface change. `verify*Pin` still gates on PIN + freshness.                                                                                                                                                                                                                                                   |
| **T** — Tampering       | Negligible       | A malicious or buggy client could send a stale `optIn` payload on a subsequent verify; the backend gates persistence on `!user.phoneVerified && !user.emailVerified`. After first verify it's a no-op. Profile-level changes still require a session and post against the user's own `_id` per `getUserProfileAction`. |
| **R** — Repudiation     | No               | Consent state is persistable; audit trail piggybacks on existing `User.updatedAt` and the `AuditLogService` write in `updateProfileAction` (preferences-tab uses `updatePreferencesAction` which delegates to `ProfileService.updateProfile` — same code path as existing prefs).                                      |
| **I** — Info disclosure | No               | Communication-preference state is visible only to the authenticated user + admins, same as existing email/sms/push fields. Not exposed in any public API endpoint added by this REQ.                                                                                                                                   |
| **D** — DoS             | No               | No new endpoint; no extra DB calls vs existing verify-pin path; `user.set` paths are single-doc and synchronous.                                                                                                                                                                                                       |
| **E** — Elevation       | No               | No role / permission change; no new caller path.                                                                                                                                                                                                                                                                       |

## Threat model — opt-in persistence gate

The fix relies on `if (optIn && !user.phoneVerified && !user.emailVerified)` as the only gate. Failure modes considered:

1. **Returning user verifies a different channel** — e.g. user signed up via email, then later does SMS PIN. By the time the SMS PIN-entry checkbox would be sent, `emailVerified === true` → gate blocks. **Outcome**: stale payload is a no-op. The user's profile-set preferences are preserved.

2. **Race on simultaneous verifies** — two concurrent verify-pin calls on the same user could both see `!phoneVerified && !emailVerified` and both write. **Outcome**: both writes resolve to the same `optIn` value (the client sent the same checkbox state). The Mongoose `user.save()` is last-write-wins, but both writes set the same value. No mitigation needed.

3. **Client lies about `isNewUser`** — a malicious client could render the checkbox for a returning user and submit `optIn`. The backend gate still blocks persistence on the returning-user case. Client-side rendering is convenience-only; security is server-enforced.

4. **Tampering at the WhatsApp send path** — out of scope for REQ-053. The send path doesn't exist yet (WA-2). When it does, it MUST check `whatsappTransactional` for transactional templates and `whatsappMarketing` for marketing templates before calling Meta's API. REQ-053 only writes the state; WA-2 reads it.

## Privacy / regulatory

- **Nigeria's NDPR** does not require explicit consent for service-related (transactional) comms; **Meta WhatsApp Business Policy** does require it for any non-OTP message. The opt-in checkbox plus the default behaviour (transactional on, marketing off) satisfy Meta's requirement.
- **Marketing opt-out default = false** matches the safer-by-default principle if anyone overlooks the checkbox state (which they would have to do to send marketing).
- No new personal data is collected — the consent state is internal app state, not a new identity field.

## Static analysis

`semgrep scan --config auto <REQ-053 files>` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. No new packages introduced.

## Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- WA-1 (Meta template approvals) — separate process.
- WA-2 (`NotificationService.send`) — must read these fields when it ships.
- P0 #5 (communication preferences enforced on outbound) — also in WA-2's scope.
