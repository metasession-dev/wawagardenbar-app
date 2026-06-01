# REQ-055 — NotificationLog persistent audit log

**Requirement ID:** REQ-055
**Risk Level:** LOW-MEDIUM
**GitHub Issue:** [#117 WA-5](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Context

REQ-054 added the `NotificationService.send()` orchestrator that routes outbound transactional touches through WhatsApp → email → SMS. Its v1 observability is `console.log` only — every attempt is JSON-line-logged with `event: 'notification.attempt'`, but nothing's persisted. Two consequences:

1. **No "why didn't I get the message?" forensics.** When a customer says they didn't receive an order confirmation, the only signal is whatever's left in the runtime logs (Railway log retention, no structured query).
2. **No SMS-fallback cost sizing.** Without a tally of how many email/SMS fallbacks actually fired, the bar can't size the channel mix.

Separately, Meta sends **delivery-status events** (`sent` → `delivered` → `read` → `failed`) to the WABA's webhook URL. The existing `app/api/webhooks/whatsapp/route.ts` already verifies Meta's signature and calls `WhatsAppService.handleWebhook(payload)`. That handler parses status events but currently only `console.log`'s them.

REQ-055 closes both gaps with a persistent `NotificationLog` collection + a service that writes on outbound attempt + updates on delivery-status callbacks.

## Acceptance criteria

1. **AC1 — `NotificationLog` model** — new Mongoose model `models/notification-log-model.ts` with fields:
   - `templateKey: string` (required) — e.g. `order_confirmation`
   - `userId: string | null` (required, indexed) — recipient OID; null for guest sends
   - `channel: 'whatsapp' | 'email' | 'sms'` (required)
   - `success: boolean` (required) — outcome of the send attempt
   - `messageId: string | null` (optional, indexed for status lookups) — Meta's `wamid:` from `WhatsAppService.sendMessage`'s `messageId` field; null for email/SMS or for failed WA sends
   - `status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'` (required, default `'queued'`) — tracks lifecycle for WA sends; email/SMS rows stay at `'sent'` / `'failed'`
   - `failureReason: string | null` — populated on failure
   - `durationMs: number | null` — from REQ-054's attempt timing
   - `attemptedAt: Date` (required, default Date.now) — when the send was attempted
   - `updatedAt: Date` — auto via timestamps

2. **AC2 — `NotificationLogService`** — new service `services/notification-log-service.ts` with:
   - `static async recordAttempt({ templateKey, userId, channel, success, messageId?, failureReason?, durationMs? })` — writes a new doc, returns the doc id. Non-blocking semantics: any persistence error is `console.error`'d, never re-thrown.
   - `static async updateStatus(messageId, status, failureReason?)` — finds by `messageId` and updates `status` + (if `failed`) `failureReason`. Idempotent: if the doc is already at the same status, no-op; if a "lower" status arrives after a "higher" (e.g. `delivered` after `read`), no-op (status lifecycle is monotonic).

3. **AC3 — wire REQ-054's `logAttempt`** — `services/notification-service.ts:logAttempt` keeps the `console.log` (greppable for ops) and additionally calls `NotificationLogService.recordAttempt`. Pass through `templateKey`, `userId`, `channel`, `success`, `durationMs`, `failureReason`, and (when present) the WhatsApp `messageId` returned from `WhatsAppService.sendMessage`.

4. **AC4 — wire `WhatsAppService.handleWebhook`** — the existing status-event branch in `lib/whatsapp.ts:handleWebhook` (lines ~245-280) keeps its `console.log` and additionally calls `NotificationLogService.updateStatus(messageId, statusType, errorTitle)`. The route at `app/api/webhooks/whatsapp/route.ts` doesn't change; `handleWebhook` already runs on a verified payload.

5. **AC5 — idempotent status updates** — `updateStatus` uses a Mongoose update filter that gates on status-position-doesn't-go-backwards (e.g. `delivered → read` allowed, `read → delivered` blocked). Concrete: an enum-ordered comparison in the filter (`{ status: { $in: positionsAtOrBefore(newStatus) } }`).

6. **AC6 — backwards-compat** — if the model isn't present yet (fresh deploy with no migration), the existing `console.log` line in `logAttempt` still fires. Persistence failures are swallowed (logged via `console.error`) so they never break the send path. The orchestrator's return shape is unchanged.

## Technical approach

### 1. `models/notification-log-model.ts` (new, ~60 LOC)

Mongoose model with the fields above. Compound indexes:

- `{ userId: 1, attemptedAt: -1 }` — "show me this user's recent notifications"
- `{ messageId: 1 }` (sparse) — fast status-update lookup
- `{ attemptedAt: -1 }` — admin recent-failures view

`{ timestamps: true }` for `createdAt` / `updatedAt`. `attemptedAt` is a separate field so backfill/reattribution doesn't lose the original moment.

### 2. `services/notification-log-service.ts` (new, ~80 LOC)

Two static methods. `recordAttempt` wraps the `NotificationLogModel.create` in try/catch with `console.error` on failure — **never re-throws**. `updateStatus` does a `findOneAndUpdate` with the monotonic status filter; logs on no-match (could be a phantom Meta event, common during rollouts).

### 3. Wire `services/notification-service.ts:logAttempt` (small change, ~5 LOC)

```diff
 function logAttempt(templateKey, userId, attempt) {
   console.log(JSON.stringify({ event: 'notification.attempt', ... }));
+  NotificationLogService.recordAttempt({
+    templateKey, userId, channel: attempt.channel, success: attempt.success,
+    messageId: attempt.messageId, failureReason: attempt.error,
+    durationMs: attempt.durationMs,
+  }).catch(() => undefined);
 }
```

Plus a small augmentation to `NotificationAttempt` interface: add `messageId?: string` field. Populated from `result.messageId` in the WhatsApp branch.

### 4. Wire `lib/whatsapp.ts:handleWebhook` (small change, ~10 LOC)

In the existing status-event loop, after the `console.log` block for delivered / read / failed:

```diff
+  await NotificationLogService.updateStatus(
+    messageId,
+    statusType, // 'sent' | 'delivered' | 'read' | 'failed'
+    statusType === 'failed' ? (status.errors?.[0]?.title ?? '') : null
+  ).catch(() => undefined);
```

### 5. No env vars, no new packages, no DB migration

The `NotificationLogModel` collection is created lazily on first write. Existing user docs are unaffected.

## Tests (TDD — written before implementation)

### `__tests__/models/notification-log-model.test.ts` (~5 cases)

- AC1 — schema defaults: `status` defaults to `'queued'`; `attemptedAt` defaults to now-ish.
- AC1 — required fields throw validation error if missing (`templateKey`, `channel`, `success`).
- AC1 — `status` enum constraint rejects `'in_progress'` etc.
- AC1 — explicit overrides honoured at construction.
- AC1 — `userId: null` accepted (guest path).

### `__tests__/services/notification-log-service.test.ts` (~8 cases)

- AC2 — `recordAttempt` writes a doc with the passed fields; returns the doc id.
- AC2 — `recordAttempt` swallows DB errors via `console.error`; never throws (test: mock `Model.create` to reject; assert no throw + `console.error` called).
- AC2 — `updateStatus(messageId, 'delivered')` updates a queued doc.
- AC5 — `updateStatus('m1', 'sent')` then `updateStatus('m1', 'delivered')` ends at `delivered`.
- AC5 — `updateStatus('m1', 'read')` then `updateStatus('m1', 'delivered')` stays `read` (no backwards transition).
- AC5 — `updateStatus('m1', 'failed', 'no contact')` records failureReason.
- AC2 — `updateStatus` for unknown `messageId` logs no-match warning, doesn't throw.
- AC5 — `failed` is terminal: subsequent `updateStatus('m1', 'delivered')` doesn't overwrite `'failed'`.

### `__tests__/services/notification-service.log-integration.test.ts` (~2 cases)

- AC3 — `NotificationService.send` calls `NotificationLogService.recordAttempt` for each attempt with the right shape.
- AC3 — persistence failure inside `recordAttempt` doesn't break the send path (caller still gets `{ success, sentVia }`).

## Dependencies

- **REQ-054** — `NotificationService.send` + `logAttempt`. ✅ Released 2026-06-01.
- **Existing `app/api/webhooks/whatsapp/route.ts`** — already verifies Meta's signature and dispatches to `WhatsAppService.handleWebhook`. **No changes.**
- **Existing `lib/whatsapp.ts:handleWebhook`** — already parses status events. ~10 LOC addition per AC4.
- **No new packages, no env vars, no DB migration.**

## Security considerations

### STRIDE

| Cat                     | Risk                                                                                                                                  | Mitigation                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **S** — Spoofing        | The webhook route already verifies Meta's `x-hub-signature-256` HMAC-SHA256. REQ-055 doesn't change the auth surface                  | None needed — existing route handles it                              |
| **T** — Tampering       | Spoofing covers it. Status updates inside the DB are gated by the monotonic-status filter (AC5)                                       | AC5 + tests                                                          |
| **R** — Repudiation     | Every attempt + every status change is persisted with timestamps                                                                      | This REQ IS the audit trail                                          |
| **I** — Info disclosure | The log persists metadata (templateKey, userId, channel, messageId, status) — no message _content_. Admin-only query surface          | Admin paths are existing-pattern; no new endpoint exposed by REQ-055 |
| **D** — DoS             | Each `recordAttempt` is one DB insert; each `updateStatus` is one update. Meta webhook payloads are small. Indexes prevent slow scans | Compound indexes per AC1                                             |
| **E** — Elevation       | No role/permission change                                                                                                             | —                                                                    |

### Privacy / regulatory

- No new PII collected. The log persists fields already on the User doc (userId, channel) + Meta-provided message IDs.
- Retention is unbounded in v1. A future REQ can add a TTL index or admin-driven purge.

### Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Rollback plan

1. Single PR. `git revert <merge-sha>` removes the new model, service, and the wire-ups. The `NotificationLog` collection persists in MongoDB (harmless; orphaned table). No data loss; no schema change to existing collections.
2. No DB migration to roll back.
3. Detection: `NotificationLog.find().count()` stops growing post-revert; `console.log` lines from REQ-054 keep firing as the only observability source.

## Test scope

| Gate                            | Expected                                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0                                                                                         |
| `npx vitest run`                | 0 failures; new tests pass; existing suite unchanged                                           |
| `npx eslint <changed>`          | 0 errors                                                                                       |
| `semgrep scan --severity ERROR` | 0 new findings on REQ-055 code                                                                 |
| `npm audit --audit-level=high`  | 0 high/critical                                                                                |
| E2E focused                     | n/a — server-side surface; unit boundary is load-bearing; per `project_e2e_targeted_until_117` |

## Plan deviation log

(populated during implementation if anything diverges from the above)
