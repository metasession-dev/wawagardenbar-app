# REQ-056 — WhatsApp inbound-message router

**Requirement ID:** REQ-056
**Risk Level:** MEDIUM-HIGH
**GitHub Issue:** [#117 WA-3](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Context

The WhatsApp surface is outbound-only today. `WhatsAppService.handleWebhook` in `lib/whatsapp.ts` parses inbound message events but only `console.log`'s them; nothing routes customer replies, nothing honours `STOP`, nothing creates the User record that future outbound sends would gate on.

Meta WhatsApp Business Policy makes the `STOP` opt-out keyword a hard compliance requirement — failing to honour it is grounds for WABA suspension. The current handler does not honour it. Separately, Meta opens a 24-hour "customer service window" when a customer messages us, during which free-form replies are allowed without a template. Today that window is unused.

REQ-056 closes both gaps with a customer-state-aware router that:

1. Classifies the inbound by **customer state** (new / signing_up / active / dormant) and by **intent** (opt_out / chat_with_staff / support_text).
2. Persists every inbound to a new `IncomingMessage` audit collection (companion to REQ-055's `NotificationLog`).
3. Honours STOP by clearing both WhatsApp consent flags (`whatsappTransactional`, `whatsappMarketing`) and confirming free-form.
4. Sends the state-appropriate welcome template via REQ-054's `NotificationService.send` for non-active states.
5. Auto-creates a `User` row for unknown phone numbers so the customer is referenceable on future inbound messages.

REQ-055 already wired the **status-event** branch of `handleWebhook` to `NotificationLogService.updateStatus`; REQ-056 owns the **inbound-message** branch of the same function. The route at `app/api/webhooks/whatsapp/route.ts` does HMAC-SHA256 signature verification and is **unchanged** by this REQ.

## Acceptance criteria

1. **AC1 — `IncomingMessage` model** — new Mongoose model `models/incoming-message-model.ts` with fields:
   - `from: string` (required, indexed) — Meta's `wa_id` (sanitized phone)
   - `body: string | null` — text body if message type is `text`, otherwise null (image / sticker / interactive button payload labels are coerced to text-equivalent where possible)
   - `messageType: string` (required) — `text` / `interactive` / `image` / etc. straight from Meta's payload
   - `messageId: string` (required, unique) — Meta's inbound message id
   - `classifiedState: 'new' | 'signing_up' | 'active' | 'dormant'` (required)
   - `classifiedIntent: 'opt_out' | 'chat_with_staff' | 'support_text'` (required)
   - `actionTaken: string` (required) — short tag describing the router's decision (e.g. `'sent_welcome_new_user'`, `'persisted_opt_out'`, `'queued_for_staff'`)
   - `userId: string | null` — resolved/created User OID
   - `receivedAt: Date` (required, default Date.now)
   - `createdAt` / `updatedAt` — auto via `{ timestamps: true }`

2. **AC2 — customer-state classifier** — helper `classifyCustomerState(phone)` in the inbound service:
   - Looks up `UserModel.findOne({ phone: sanitizedPhone, accountStatus: { $ne: 'deleted' } })`
   - Returns `{ state, user }` where:
     - `'new'` — no User row found
     - `'signing_up'` — User exists, `phoneVerified === false`
     - `'active'` — User exists, `phoneVerified === true`, `lastLoginAt` within 30 days
     - `'dormant'` — User exists, `phoneVerified === true`, `lastLoginAt > 30d` ago OR null

3. **AC3 — intent classifier** — helper `classifyMessageIntent(message)` returns one of:
   - `'opt_out'` — text body matches `/^\s*(stop|unsubscribe|opt[-\s]?out)\s*$/i` (case-insensitive; Meta-required STOP keywords)
   - `'chat_with_staff'` — text body equals the welcome-template Quick Reply payload (`"💬 Chat with Staff"`) OR Meta `interactive.button_reply.title` equals same OR `interactive.button_reply.id` equals `chat_with_staff`
   - `'support_text'` — default catch-all for any other text content

4. **AC4 — routing matrix** — `state × intent → action`. For each combination, the router takes the action below, persists the action tag on the `IncomingMessage`, and returns:

   | state          | opt_out                                                      | chat_with_staff                                     | support_text                                        |
   | -------------- | ------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------- |
   | **new**        | auto-create User + persist opt-out flags + free-form confirm | auto-create User + send `welcome_new_user` template | auto-create User + send `welcome_new_user` template |
   | **signing_up** | persist opt-out flags + free-form confirm                    | send `welcome_new_user` (re-engagement)             | send `welcome_new_user`                             |
   | **active**     | persist opt-out flags + free-form confirm                    | log to staff queue (no template)                    | log to staff queue (no template)                    |
   | **dormant**    | persist opt-out flags + free-form confirm                    | send `welcome_back`                                 | send `welcome_back`                                 |

5. **AC5 — STOP compliance** — `'opt_out'` MUST set `preferences.communicationPreferences.whatsappTransactional = false` AND `preferences.communicationPreferences.whatsappMarketing = false` on the user doc, regardless of state. For the `'new'` state the user is auto-created first, then opt-out flags persisted on the new doc. Confirmation is a free-form WhatsApp reply (template-less) inside the 24h window — Meta does not restrict free-form replies once a customer has messaged us. The confirmation send is best-effort; failure does not block the opt-out persistence.

6. **AC6 — User auto-creation for new phone numbers** — `classifyCustomerState` triggers `UserModel.create({ phone, phoneVerified: false, isGuest: false })` when no row exists. Mirrors the pattern in `app/actions/auth/send-pin.ts`. Created users start with WhatsApp defaults (transactional `true`, marketing `false`), then if the intent was `'opt_out'` the flags are immediately overwritten per AC5.

7. **AC7 — safety / backwards-compat** — All routing logic wrapped in try/catch with `console.error`; webhook always returns 200 (existing pattern); persistence failures swallowed; outbound send failures swallowed (REQ-054's NotificationService handles its own fallback logic). The existing `console.log` lines in `handleWebhook`'s inbound branch are retained for ops grep.

8. **AC8 — wire into existing `handleWebhook`** — Replace the current TODO log-only block for inbound messages (`lib/whatsapp.ts:314-336`) with a call to `WhatsAppInboundService.handle(message, value)`. Status-event branch (REQ-055) untouched. Use the lazy-import pattern established in REQ-055's status-update wiring to avoid the `lib/whatsapp` ↔ `services/whatsapp-inbound-service` ↔ `services/notification-service` circular.

## Technical approach

### 1. `models/incoming-message-model.ts` (new, ~60 LOC)

Mongoose model with the fields in AC1. Compound indexes:

- `{ from: 1, receivedAt: -1 }` — "show me this customer's recent inbound traffic"
- `{ messageId: 1 }` — unique; serves as the dedup gate if Meta retries
- `{ receivedAt: -1 }` — admin recent-inbound view

`{ timestamps: true }`. Same shape and discipline as REQ-055's `NotificationLogModel`.

### 2. `services/whatsapp-inbound-service.ts` (new, ~200 LOC)

Three exposed surfaces:

- `classifyCustomerState(phone) → { state, user }` — pure lookup against `UserModel`. Returns `'new'` with `user: null` when no row found; the caller decides whether to auto-create.
- `classifyMessageIntent(message) → 'opt_out' | 'chat_with_staff' | 'support_text'` — pure switch on Meta payload shape; no DB.
- `handle(message, value)` — orchestrator. Reads the inbound, classifies, routes per the matrix, persists `IncomingMessage`, sends outbound reply via `NotificationService.send`. Returns the action tag string (for tests).

Internal helpers:

- `applyOptOut(user)` — persists `whatsappTransactional: false`, `whatsappMarketing: false`. Uses `$set` on the nested path to avoid clobbering other preferences.
- `sendFreeFormConfirmation(phone, text)` — bypasses the template gate (24h window) by calling `WhatsAppService` directly with a `type: 'text'` payload. Best-effort; failures swallowed.

### 3. `lib/whatsapp-inbound-templates.ts` (new, ~25 LOC)

```ts
export const INBOUND_WELCOME_TEMPLATE: Record<CustomerState, string | null> = {
  new: 'welcome_new_user',
  signing_up: 'welcome_new_user',
  active: null, // free-form / staff handles it
  dormant: 'welcome_back',
};
```

Single source for the state→template mapping. Keeps the routing decisions out of the orchestrator switch statements.

### 4. Wire `lib/whatsapp.ts:handleWebhook` inbound branch (~10 LOC change)

Replace the current `for (const message of messages)` body with a lazy-imported call to the new service:

```diff
-  if (messageType === 'text') {
-    console.log('User sent text message:', message.text?.body);
-  }
+  try {
+    const { WhatsAppInboundService } = await import(
+      '@/services/whatsapp-inbound-service'
+    );
+    await WhatsAppInboundService.handle(message, value);
+  } catch (error) {
+    console.warn('[WhatsApp] inbound routing skipped:',
+      error instanceof Error ? error.message : String(error));
+  }
```

The existing `console.log` summarising the inbound is retained on the line above.

### 5. Add a free-form text-send method to `WhatsAppService` (~25 LOC)

Today `WhatsAppService.sendMessage` only sends templates. The STOP confirmation needs a free-form text reply. Add:

```ts
static async sendTextMessage(to: string, body: string): Promise<WhatsAppResult>
```

Same shape as `sendMessage` but with `type: 'text'` + `text: { body }` instead of the template block. Same error mapping. Falls under the 24-hour window rule — only valid when responding to an inbound within 24h, which is exactly the inbound-router context.

### 6. No env vars, no new packages, no DB migration

`IncomingMessageModel` collection created lazily on first write. No changes to existing collections. `welcome_new_user` and `welcome_back` template approvals are tracked separately (WA-1, blocked at Meta) — when the templates aren't approved, REQ-054's NotificationService returns `TEMPLATE_NOT_FOUND` and falls through to email, which for an inbound-WA customer means no reply is delivered. The IncomingMessage audit log still records the inbound; STOP opt-out persistence still works (uses the free-form text path, not the template path).

## Tests (TDD — written before implementation)

### `__tests__/models/incoming-message-model.test.ts` (~5 cases)

- AC1 — schema defaults: `receivedAt` defaults to now-ish.
- AC1 — required fields throw validation if missing (`from`, `messageType`, `messageId`, `classifiedState`, `classifiedIntent`, `actionTaken`).
- AC1 — `classifiedState` enum constraint rejects unknown values.
- AC1 — `classifiedIntent` enum constraint rejects unknown values.
- AC1 — `userId: null` accepted (new-customer auto-create path before User exists).

### `__tests__/services/whatsapp-inbound-service.classify.test.ts` (~12 cases)

State classifier (6 cases):

- AC2 — no user → `'new'` with `user: null`.
- AC2 — user with `phoneVerified: false` → `'signing_up'`.
- AC2 — user with `phoneVerified: true`, `lastLoginAt: now` → `'active'`.
- AC2 — user with `phoneVerified: true`, `lastLoginAt: 31 days ago` → `'dormant'`.
- AC2 — user with `phoneVerified: true`, `lastLoginAt: undefined` → `'dormant'`.
- AC2 — deleted-account user (`accountStatus: 'deleted'`) skipped → `'new'`.

Intent classifier (6 cases):

- AC3 — text body `"STOP"` → `'opt_out'`.
- AC3 — text body `"stop  "` (whitespace + lowercase) → `'opt_out'`.
- AC3 — text body `"unsubscribe"` → `'opt_out'`.
- AC3 — text body `"💬 Chat with Staff"` → `'chat_with_staff'`.
- AC3 — interactive button reply with `title: "💬 Chat with Staff"` → `'chat_with_staff'`.
- AC3 — text body `"hi can I get a menu"` → `'support_text'`.

### `__tests__/services/whatsapp-inbound-service.routing.test.ts` (~10 cases)

Router orchestration — one per significant cell of the matrix, plus safety:

- AC4 — `new` + `support_text` → auto-creates User, sends `welcome_new_user`, persists `IncomingMessage` with `actionTaken: 'sent_welcome_new_user'`.
- AC4 — `signing_up` + `support_text` → no auto-create, sends `welcome_new_user`.
- AC4 — `active` + `support_text` → no template send, `actionTaken: 'queued_for_staff'`.
- AC4 — `dormant` + `chat_with_staff` → sends `welcome_back`.
- AC5 — `active` + `opt_out` → calls `UserModel.updateOne` setting both whatsapp flags to false; sends free-form text confirmation; `actionTaken: 'persisted_opt_out'`.
- AC5 — `new` + `opt_out` → auto-creates User, persists opt-out flags on the new doc.
- AC5 — `opt_out` persists even when the outbound free-form confirmation fails.
- AC6 — `new` + `support_text` calls `UserModel.create` with `{ phone, phoneVerified: false, isGuest: false }`.
- AC7 — `IncomingMessage.create` rejecting does not throw out of `handle()`.
- AC7 — `NotificationService.send` rejecting does not throw out of `handle()`.

### `__tests__/lib/whatsapp.inbound-integration.test.ts` (~2 cases)

- AC8 — `handleWebhook` with an inbound messages payload calls `WhatsAppInboundService.handle` once per message.
- AC8 — `handleWebhook` with a status-events payload does NOT call the inbound service (existing REQ-055 path stays untouched).

## Dependencies

- **REQ-053** — `whatsappTransactional` / `whatsappMarketing` consent fields on `IPreferences.communicationPreferences`. ✅ Released 2026-05-31.
- **REQ-054** — `NotificationService.send` for outbound welcome templates. ✅ Released 2026-06-01.
- **REQ-055** — `IncomingMessage` mirrors `NotificationLog` shape; lazy-import pattern established. ✅ Released 2026-06-01.
- **Existing `app/api/webhooks/whatsapp/route.ts`** — Meta HMAC-SHA256 signature verification. **No changes.**
- **Existing `lib/whatsapp.ts`** — status-event branch (REQ-055) untouched; inbound-message branch rewired (~10 LOC); new `sendTextMessage` method added (~25 LOC).
- **`lib/auth-utils.ts:sanitizePhone`** — existing helper, reused.
- **No new packages, no env vars, no DB migration.**

## Security considerations

### STRIDE

| Cat                     | Risk                                                                                                                   | Mitigation                                                                                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | Inbound webhook events from a non-Meta source could trigger router logic (User auto-create, opt-out, welcome template) | Route at `app/api/webhooks/whatsapp/route.ts` verifies `x-hub-signature-256` HMAC-SHA256 against `META_APP_SECRET` BEFORE `handleWebhook` runs. REQ-056 does not change that. Same posture as REQ-055                                                                  |
| **T** — Tampering       | Malicious phone-number input could attempt NoSQL injection through `findOne({ phone })`                                | `sanitizePhone()` strips to digits + leading `+` only — no operator characters survive. Mongoose treats the value as a string, not an expression                                                                                                                       |
| **R** — Repudiation     | Every inbound message is persisted in `IncomingMessage` with phone, messageId, classifications, action taken           | `IncomingMessage` IS the audit trail; mirror of REQ-055's `NotificationLog` for the inbound direction                                                                                                                                                                  |
| **I** — Info disclosure | Persisting raw message bodies could expose PII if `IncomingMessage` query surface ever leaks                           | No new query endpoint exposed by REQ-056. Future admin UI is a separate REQ. Body is logged for support context, same posture as today's `console.log` — no regression                                                                                                 |
| **D** — DoS             | Mass-flood of inbound messages could write-storm Mongo, create-storm Users, or saturate outbound send                  | Each inbound = constant-time work (one find, one create-if-missing, one log write, at most one outbound send). Mongo handles trivially at expected volumes. Webhook ACKs 200 fast (existing pattern). Rate-limiting at webhook ingress is a future operational concern |
| **E** — Elevation       | Auto-created User starts with `role: 'customer'` (Mongoose default), never with elevated permissions                   | `UserModel.create({ phone, phoneVerified: false, isGuest: false })` — no role override; defaults are restrictive                                                                                                                                                       |

### Privacy / regulatory

- Phone numbers are already collected at signup; persisting them on inbound messages is no new PII surface.
- Message bodies are persisted — this is the audit-trail tradeoff. A future REQ can add a TTL index or admin-driven purge.
- STOP compliance is the user-protection lever: once opted out, no further marketing or transactional WhatsApp sends.

### Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Rollback plan

1. Single PR. `git revert <merge-sha>` removes the new model, service, templates module, and the `handleWebhook` inbound branch is restored to its log-only TODO state. The `IncomingMessage` collection persists in MongoDB (harmless; orphaned table). No data loss; no schema change to existing collections.
2. Any auto-created User rows from the new-state inbound path persist (legitimate accounts — phone numbers that messaged us). They behave identically to pre-REQ-056 users with `phoneVerified: false`.
3. Any opt-out flags persisted via STOP also persist — that's the desired behaviour even after rollback; we don't unsend an opt-out.
4. Detection: `IncomingMessage.find().count()` stops growing post-revert; `console.log` lines in `handleWebhook` keep firing as the only observability source for inbound.

## Test scope

| Gate                            | Expected                                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`              | exit 0                                                                                                 |
| `npx vitest run`                | 0 failures; new tests pass; existing suite unchanged                                                   |
| `npx eslint <changed>`          | 0 errors                                                                                               |
| `semgrep scan --severity ERROR` | 0 new findings on REQ-056 code                                                                         |
| `npm audit --audit-level=high`  | 0 high/critical                                                                                        |
| E2E focused                     | n/a — server-side webhook surface; unit boundary is load-bearing; per `project_e2e_targeted_until_117` |

## Plan deviation log

(populated during implementation if anything diverges from the above)
