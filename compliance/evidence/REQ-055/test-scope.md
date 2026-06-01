# REQ-055 — Test scope

**Requirement:** NotificationLog persistent audit log (#117 WA-5).

## In scope

- **Unit (model)** — `__tests__/models/notification-log-model.test.ts` (6 cases) — defaults (`status: 'queued'`, `attemptedAt: now`), required-field validation, enum constraints on `status` + `channel`, `userId: null` accepted for guest path.
- **Unit (service)** — `__tests__/services/notification-log-service.test.ts` (10 cases) — `recordAttempt` happy path + guest path + error-swallowing; `updateStatus` happy path + failureReason field + monotonic filter (`queued → sent` allowed, `delivered → read` allowed, `failed` terminal); unknown messageId returns false without throw; persistence error swallowed.
- **Integration** — `__tests__/services/notification-service.log-integration.test.ts` (3 cases) — REQ-054's `NotificationService.send` → `logAttempt` → `NotificationLogService.recordAttempt` wire-up (success path with messageId, fallback chain producing two attempts, persistence rejection doesn't break send path).
- **Regression** — full vitest suite runs to confirm no impact on existing tests.
- **Static** — `tsc --noEmit`, `eslint`, `semgrep --config auto`, `npm audit --audit-level=high`.

## Out of scope

- **Webhook route signature verification** — `app/api/webhooks/whatsapp/route.ts` already exists with HMAC-SHA256 verification + GET-handshake; not modified by REQ-055. Existing route is covered by manual review.
- **Inbound-message state-machine routing** — WA-3 owns. REQ-055 only wires the _status_ events branch in `handleWebhook`.
- **Admin UI for the audit log** — future REQ.
- **TTL / retention policy** — future REQ; the log is unbounded in v1.
- **E2E spec** — server-side surface; unit boundary is load-bearing; honours `project_e2e_targeted_until_117` policy.

## Risk-based depth

LOW-MEDIUM risk → unit + integration is the load-bearing gate. 19 cases cover: model defaults + enums + validation, service write/update lifecycle, monotonic gate at all 4 status transitions, persistence failure swallowing on both methods, integration with REQ-054's send path including fallback. Webhook signature verification doesn't appear in the scope because it pre-exists and isn't modified.
