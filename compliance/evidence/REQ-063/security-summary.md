# REQ-063 — Security summary

## Threat model — STRIDE pass over the changed surfaces

| Category               | Surface                                      | Assessment                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofing               | PIN-entry opt-in payload                     | Not a new spoofing surface — the payload is only persisted after the OTP verifies. A forged payload before OTP success has no effect. Mirrors REQ-053's contract.                                                                                   |
| Tampering              | Server-side `NotificationService` email gate | Marketing-category email gating is enforced server-side. A client cannot bypass the gate by crafting a different email payload — the closure is invoked only after `shouldSendEmail(user, category)` returns true.                                  |
| Repudiation            | Consent capture                              | `communicationPreferencesUpdatedAt` is server-stamped (the client never supplies the value). Prevents both backdating and "I never consented" repudiation post-hoc.                                                                                 |
| Information disclosure | New schema fields                            | `emailMarketing` + `communicationPreferencesUpdatedAt` are part of the user document. No new endpoints expose them; the existing profile read path (already returning preferences) now includes them. No PII added; the timestamp is non-sensitive. |
| Denial of service      | Marketing email gate                         | Not a new DoS surface. The gate either short-circuits (no closure invoked) or invokes the same email closure as today. No additional Mongo queries beyond the existing user lookup.                                                                 |
| Elevation of privilege | None                                         | No new auth surface, no new permission boundary, no new admin action. The preferences page already lets a logged-in user toggle their own communication preferences; this REQ adds one more toggle.                                                 |

## Authentication & authorisation

- **No new endpoints.** All changes layer onto existing endpoints (`verifyPinAction` / its email + WhatsApp siblings, `updatePreferencesAction`).
- **No new permission checks.** The existing session-based gate in `updatePreferencesAction` (`session.isLoggedIn && session.userId`) continues to govern who can change preferences.
- **OTP flow integrity preserved.** Opt-in payload persistence still gated on `!user.phoneVerified && !user.emailVerified` — the first-verify-only contract from REQ-053 is intact.

## Data protection

- **GDPR explicit-consent posture (Art. 7).** Splitting `whatsappOptIn` into independent transactional + marketing checkboxes captures genuine separate consent. `emailMarketing` ditto. The audit timestamp proves _when_ consent was actively given, not when a system default was assumed. Pre-REQ-063 users with collapsed REQ-053 consent are deliberately left alone (operator decision) — their last explicit interaction stands.
- **No new PII collected.** Preferences and a timestamp; no new identifiers, location, or contact data.
- **Right-to-export coverage.** The new fields will be picked up by the future data-export REQ (REQ-065 in this trio) automatically — they live on the existing user document.

## Dependency audit

- **No new packages** added in this REQ.
- `npm audit --audit-level=high`: 0 vulnerabilities on the changed branch.

## SAST

- ESLint: 0 errors. 950 pre-existing `no-console` warnings — unchanged.
- Semgrep / CI Security gate: SUCCESS (run 26888266053 — CI Pipeline includes the gate).

## Rollback

Revert PR #266. The change is purely additive (new optional schema fields, new gate branch, new UI toggles). The schema fields stay valid post-revert (Mongoose treats unknown payload keys as ignored); the audit timestamp simply stops being populated. No data integrity exposure during a rollback window.
