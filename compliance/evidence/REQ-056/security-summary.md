# REQ-056 — Security summary

**Requirement ID:** REQ-056
**Risk class:** MEDIUM-HIGH
**Surface:** new `models/incoming-message-model.ts`, `services/whatsapp-inbound-service.ts`, `lib/whatsapp-inbound-templates.ts`; additions to `lib/whatsapp.ts` (new `sendTextMessage` method + rewired inbound branch in `handleWebhook`).

## STRIDE assessment

| Category                | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No               | The webhook route at `app/api/webhooks/whatsapp/route.ts` already verifies Meta's `x-hub-signature-256` HMAC-SHA256 before any payload reaches `WhatsAppService.handleWebhook` (and therefore before any `WhatsAppInboundService.handle` call). REQ-056 doesn't change the auth surface. Same posture as REQ-055.                                                                               |
| **T** — Tampering       | Low              | Malicious phone-number input could attempt NoSQL injection through `findOne({ phone })`. `sanitizePhone()` (existing helper in `lib/auth-utils.ts`) strips to digits + leading `+` only — no operator characters survive. Mongoose treats the value as a string, not an expression.                                                                                                             |
| **R** — Repudiation     | No               | Every inbound message is persisted to `IncomingMessage` with phone, messageId, classifiedState, classifiedIntent, actionTaken, userId, timestamps. Audit-trail mirror of REQ-055's `NotificationLog` on the inbound direction.                                                                                                                                                                  |
| **I** — Info disclosure | Low              | Persisting raw inbound message bodies could expose PII if `IncomingMessage` query surface ever leaks. No new query endpoint exposed by REQ-056; same posture as today's `console.log` lines. Future admin UI is a separate REQ. **Note for retention:** body content IS persisted (unlike REQ-055's NotificationLog which is metadata-only) — a future TTL/redaction policy should target this. |
| **D** — DoS             | Low              | Each inbound = constant-time work (one findOne, one create-if-missing, one log write, at most one outbound send). Mongo handles trivially at expected volumes. Webhook ACKs 200 fast regardless of persistence outcome. Rate-limiting at webhook ingress is a future operational concern.                                                                                                       |
| **E** — Elevation       | No               | Auto-created User starts with `role: 'customer'` (Mongoose default) — never with elevated permissions. `UserModel.create({ phone, phoneVerified: false, isGuest: false })` — no role override. STOP opt-out is the only privilege change; restrictive direction (turns flags OFF, never ON).                                                                                                    |

## Threat model — inbound routing lifecycle

The inbound flow is: customer messages our WA number → Meta delivers webhook → `app/api/webhooks/whatsapp/route.ts` verifies signature → `WhatsAppService.handleWebhook(payload)` parses → `WhatsAppInboundService.handle(message, value)` classifies + routes.

Failure modes considered:

1. **Spoofed inbound message with crafted body** — signature verification at the route layer blocks. The service would never see the call. Same gate REQ-055 relies on.

2. **STOP keyword bypass attempt** — what if the customer sends `"STOP."` or `"Stop please"` or `"please stop"`? Current regex `^\s*(stop|unsubscribe|opt[-\s]?out)\s*$` is strict (whole-message match only). Trade-off: false negatives on chatty STOPs ("please stop the messages") — those route to `support_text` and reach a staff queue, where a human can apply the opt-out. False positives are zero (only intentional opt-out keywords match). This matches Meta's documented STOP keyword set; conservative is correct here — accidentally opting people out is worse than missing chatty STOPs that a human will catch.

3. **Spam flood from a single phone** — each inbound = constant-time work. Per `from` an attacker creates one User row + writes one IncomingMessage per message. Mongo handles trivially. The webhook route ACKs 200 fast so Meta doesn't retry-storm. Rate-limiting at webhook ingress is a future operational concern (out of scope per the plan).

4. **NoSQL injection via phone** — `sanitizePhone()` strips to digits + leading `+`. The resulting string is passed to `findOne({ phone })` as a value, not an expression. Mongoose doesn't interpret operator-shaped strings inside string-typed fields. Defense-in-depth: even if a payload escaped sanitisation, the query is value-typed against a `phone: { type: String }` schema field.

5. **Auto-create + opt-out race** — if a customer sends `"STOP"` from a phone we've never seen before, AC5 path: `classifyCustomerState('new', user: null)` → AC6 path: `UserModel.create(...)` → AC5 path: `UserModel.updateOne({ _id: newUser._id }, { $set: { ... } })`. The create-then-update sequence is two round-trips. If the create succeeds but the update fails (rare), the user exists but is NOT opted-out — i.e., they may still receive future marketing. The `try/catch` around the update logs the failure to `console.error` so it's recoverable. Stricter alternative (atomic upsert with opt-out flags baked in) is a follow-up.

6. **Persistence layer down** — `IncomingMessageModel.create`, `UserModel.create`, `UserModel.updateOne`, `NotificationService.send` and `WhatsAppService.sendTextMessage` are all individually `try/catch`-wrapped inside `handle()`. The outer `try/catch` around the whole orchestrator covers anything missed. Webhook ACK remains 200. Same safety posture as REQ-055.

7. **Meta Outbound restriction** — Meta's "Your business is restricted" alert blocks outbound template sends (WA-1 is blocked separately). REQ-056's welcome_new_user / welcome_back sends will fail through `NotificationService.send` → REQ-054's `console.warn` "no channel delivered". The IncomingMessage row still records `actionTaken: 'sent_welcome_new_user'` even when delivery failed, because the router returns the intent, not the delivery outcome. Operator-visible — fine for v1.

8. **STOP confirmation outside 24h window** — `WhatsAppService.sendTextMessage` only works within Meta's 24h customer-service window opened by the customer's incoming message. Since STOP confirmations are always sent in direct response to an inbound, the window is always open at the moment of reply. No edge case here.

## Privacy / regulatory

- No new PII collected at first contact beyond what Meta already supplies (phone via `wa_id`).
- Message body content IS persisted (different posture from REQ-055's NotificationLog which is metadata-only). **Justification:** the router needs to log what was said so operators can audit STOP opt-outs and support-queue items. A future REQ can add a Mongo TTL index or admin-driven purge endpoint.
- STOP compliance: once opted out, **no further** WhatsApp transactional or marketing send (REQ-054's NotificationService consent gate enforces). This is the Meta WABA policy requirement.

## Static analysis

`semgrep scan --severity=ERROR models/incoming-message-model.ts services/whatsapp-inbound-service.ts lib/whatsapp-inbound-templates.ts lib/whatsapp.ts` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. The unrelated vitest GHSA was patched via PR #230 between PR #229 merge and the final develop CI green; REQ-056 introduced no new packages.

## Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- Webhook signature verification → already implemented; not modified by REQ-056.
- Order-cancellation / balance-inquiry / full SupportTicket model → future REQs.
- Rate limiting at webhook ingress → future operational concern.
- TTL / retention policy on `IncomingMessage` → future REQ.
- Meta Flows / interactive lists / conversational signup → future REQ.
