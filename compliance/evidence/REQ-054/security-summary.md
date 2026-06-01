# REQ-054 — Security summary

**Requirement ID:** REQ-054
**Risk class:** MEDIUM
**Surface:** new `services/notification-service.ts`; `lib/notification-templates.ts`; one-line caller refactor in `app/actions/communication/communication-actions.ts`.

## STRIDE assessment

| Category                | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No               | No auth-surface change. The orchestrator just routes; channel boundaries (`WhatsAppService.sendMessage`, the caller's email/SMS closures) handle their own auth.                                                                                                                                                                                                                                                    |
| **T** — Tampering       | Low              | The `opts.category` override allows a caller to mark a transactional template as marketing or vice versa — could be misused to bypass marketing consent. Mitigation: the default is the static `TEMPLATE_CATEGORIES` map; override is documented as a power-caller affordance; tests cover both paths. No caller in REQ-054's refactor scope uses the override; it's there for future code that genuinely needs it. |
| **R** — Repudiation     | No               | Each attempt `console.log`'d with structured fields (AC7). v1's `console.log` line is greppable; WA-5 will add the persistent audit log.                                                                                                                                                                                                                                                                            |
| **I** — Info disclosure | No               | Phone / email already visible to admins via existing `UserModel` admin paths. The orchestrator doesn't expose user data to any new boundary.                                                                                                                                                                                                                                                                        |
| **D** — DoS             | No               | Per-call cost: one `UserModel.findById` (cached at the connection level), plus ≤ 3 channel attempts. Same as today's email send for the worst case.                                                                                                                                                                                                                                                                 |
| **E** — Elevation       | No               | No role / permission change.                                                                                                                                                                                                                                                                                                                                                                                        |

## Threat model — consent gating

The orchestrator relies on `shouldSendWhatsApp(user, category)` to gate the WhatsApp branch. Failure modes considered:

1. **User opted out of WhatsApp marketing, but template is `transactional`** — gate returns `true` (transactional consent honoured). Marketing opt-out doesn't block transactional. **Intentional** — orders / receipts / support replies still fire even if the user said no to promos.

2. **User opted out of WhatsApp transactional** — gate returns `false`; WhatsApp skipped; orchestrator tries email/SMS in turn. The user's choice to silence WhatsApp is honoured per-channel, but if they kept email or SMS on, they still get the transactional touch via that channel. **Intentional** — explicit opt-out is per-channel, not per-template.

3. **Race on simultaneous sends** — two concurrent `send` calls for the same user could both read the same prefs and both fire WhatsApp. **Bounded** — WhatsApp's own rate-limiting + idempotency at Meta's API handles message dedup. The orchestrator doesn't add its own dedup; not in scope.

4. **`opts.category` override bypassing marketing consent** — see Tampering above. Documented; tests cover; no in-tree caller uses it.

## Privacy / regulatory

- **Meta WhatsApp Business Policy compliance.** Marketing templates only fire when `whatsappMarketing === true` (AC3). Transactional templates only fire when `whatsappTransactional === true` (default true, captured at first PIN verification per REQ-053).
- **Email + SMS single-boolean consent** — `email` and `sms` booleans gate the respective channels. v1 doesn't split into marketing/transactional for those channels; future tightening when data justifies it.
- **No new personal data is collected** by REQ-054. The orchestrator reads existing consent state; doesn't write any new field.

## Static analysis

`semgrep scan --config auto services/notification-service.ts lib/notification-templates.ts app/actions/communication/communication-actions.ts` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. No new packages introduced.

## Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- WA-5 (`NotificationLog` persistent model + delivery-status webhook).
- Rewards-email refactor (WA-6).
- Support-reply outbound (WA-3 owns inbound).
- Per-channel marketing/transactional split for email + SMS.
