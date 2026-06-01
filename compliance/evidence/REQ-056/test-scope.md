# REQ-056 — Test scope

**Requirement:** WhatsApp inbound-message router (#117 WA-3).

## In scope

- **Unit (model)** — `__tests__/models/incoming-message-model.test.ts` (5 cases) — `receivedAt` default, required-field validation, enum constraints on `classifiedState` + `classifiedIntent`, `userId: null` accepted (new-customer pre-auto-create path).
- **Unit (classifier)** — `__tests__/services/whatsapp-inbound-service.classify.test.ts` (13 cases) — customer-state classifier across `new` / `signing_up` / `active` / `dormant` plus deleted-account exclusion; intent classifier across STOP/unsubscribe/opt-out regex, `"💬 Chat with Staff"` text and `interactive.button_reply`, and the support-text catch-all.
- **Unit (router)** — `__tests__/services/whatsapp-inbound-service.routing.test.ts` (10 cases) — orchestration across the state × intent matrix (new+support_text, signing_up+support_text, active+support_text, dormant+chat_with_staff), STOP compliance (active+opt_out flag persistence, new+opt_out auto-create-then-opt-out, opt_out survives outbound failure), AC6 auto-create payload, AC7 safety (IncomingMessage.create rejection + NotificationService.send rejection both swallowed).
- **Integration** — `__tests__/lib/whatsapp.inbound-integration.test.ts` (2 cases) — `handleWebhook` inbound branch delegates to `WhatsAppInboundService.handle` once per message; status-events payload does NOT call the inbound service (REQ-055 status branch stays untouched).
- **Regression** — full vitest suite runs to confirm no impact on existing tests.
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --config auto`, `npm audit --audit-level=high`.

## Out of scope

- **Webhook route signature verification** — `app/api/webhooks/whatsapp/route.ts` already exists with HMAC-SHA256 verification + GET-handshake; not modified by REQ-056. Same pre-existing surface that REQ-055 left alone.
- **Order-cancellation intent** (`/^cancel order \d+$/`) — bigger order-modification surface; deferred to a future REQ.
- **Balance-inquiry intent** — P3 #16 owns; deferred.
- **Full SupportTicket model** (P3 #17) — v1 logs `support_text` to the `IncomingMessage` collection + a `console.log`; admin queue UI is a future REQ.
- **Meta Flows / interactive lists / conversational signup** — deferred (Option B/C from prior signup-architecture discussion).
- **Mismatch / phone-recovery intent** — requires additional lookup paths; deferred.
- **Rate limiting at webhook ingress** — future operational concern.
- **E2E spec** — server-side webhook surface; unit + integration boundary is load-bearing; honours `project_e2e_targeted_until_117` policy.

## Risk-based depth

MEDIUM-HIGH risk → unit + integration is the load-bearing gate. 30 cases cover: model schema/enums/validation, customer-state lookup across all four states + deleted-account exclusion, intent classifier across all three intents including Meta interactive payloads, full routing matrix at every significant cell, STOP compliance (which is the Meta WABA policy enforcement lever), auto-create User pattern (mirrors `send-pin.ts`), and the safety-net pattern (persistence + outbound failures both swallowed inside `handle()`). Webhook signature verification doesn't appear in the scope because it pre-exists and isn't modified.
