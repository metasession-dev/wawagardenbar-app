# REQ-049 — Webhook idempotency guard (Paystack + Monnify)

- **Issue:** #166 (Ref: #117 P0 #1)
- **Risk:** HIGH
- **Commit type:** `fix`
- **Stage:** 1 (Plan) — awaiting plan approval before Stage 2 (HIGH = mandatory checkpoint)

## Context

The two payment webhook routes (`app/api/webhooks/paystack/route.ts`, `app/api/webhooks/monnify/route.ts`) currently process every signature-valid POST they receive. Both perform inventory/reward/tab side-effects with **only partial idempotency**:

| Side-effect                                          | Order path                                      | Tab path          |
| ---------------------------------------------------- | ----------------------------------------------- | ----------------- |
| Payment-status write                                 | overwrite-safe ✓                                | overwrite-safe ✓  |
| Inventory deduction                                  | **guarded** by `order.inventoryDeducted` flag ✓ | **not guarded** ✗ |
| `RewardsService.calculateReward`                     | **not guarded** ✗                               | **not guarded** ✗ |
| `TabService.markTabPaid` (tab close, status history) | n/a                                             | **not guarded** ✗ |

So a replay (provider double-delivery, manual retry, or attacker replay if signature verification ever drifts) **re-issues loyalty rewards** to the customer on every duplicate delivery. Revenue-leak grade — exactly the gap #117 P0 #1 calls out.

## Acceptance criteria

- A signature-valid webhook delivery whose provider event-id matches an already-processed event is a **no-op**: HTTP 200, no inventory mutation, no `calculateReward` call, no `markTabPaid` call, no order/tab state change beyond what the first delivery already wrote.
- First-time deliveries still complete normally (existing behaviour preserved).
- The idempotency record is **durable** (MongoDB collection, not in-memory) — survives Railway restarts/redeploys.
- The check is done **after signature verification** but **before any side-effect** in both routes — so an unsigned/spoofed event can't poison the idempotency table.
- Provider namespaces are isolated: the same string used as `eventId` by both providers (improbable but possible) does not collide.
- **Concurrency-safe:** two simultaneous deliveries of the same event must produce exactly one set of side-effects (a unique-index race-loser returns early).
- Integration tests exercise: same event sent twice → second is a no-op; concurrent duplicates → exactly one side-effect set.

## Technical approach

### New model — `models/processed-webhook-event-model.ts`

```ts
{
  provider:   { type: String, enum: ['paystack', 'monnify'], required: true, index: true },
  eventId:    { type: String, required: true },              // provider's stable per-event id
  paymentReference: { type: String },                        // for forensic lookup
  eventType:  { type: String },                              // e.g. 'charge.success'
  receivedAt: { type: Date, default: Date.now }
}
// Unique compound index — { provider: 1, eventId: 1 } — server-side dedup is the
// load-bearing control; do not rely solely on the application-layer findOne check.
```

### New helper — `lib/webhook-idempotency.ts`

Exports `recordWebhookEvent({ provider, eventId, paymentReference?, eventType? }): Promise<'new' | 'duplicate'>`:

- Attempts a `create()` on `ProcessedWebhookEventModel`. On success → returns `'new'`.
- On MongoDB error code **11000** (duplicate key) → returns `'duplicate'` (concurrency-safe path).
- On any other error → rethrows (caller's `try/catch` becomes a 500 — better than silently re-running side-effects).

This puts the dedup at the **unique-index** layer rather than a read-then-write race.

### Wire-in — both webhook routes

Insert right after the existing signature-verification block, before the database connect / order lookup. Pattern (Paystack shown; Monnify mirrors with `paymentReference`/`transactionReference`):

```ts
// After signature check, before any side-effect:
const eventId = String(data.id ?? data.reference); // Paystack: data.id (numeric) or fallback to reference
const dedup = await recordWebhookEvent({
  provider: 'paystack',
  eventId,
  paymentReference: data.reference,
  eventType: event,
});
if (dedup === 'duplicate') {
  console.warn(
    `[REQ-049] Paystack replay ignored: event=${eventId} ref=${data.reference}`
  );
  return NextResponse.json(
    { message: 'Event already processed' },
    { status: 200 }
  );
}
// …existing logic continues
```

For Monnify: `eventId = String(payload.transactionReference ?? payload.paymentReference)`, `provider: 'monnify'`. Both providers expose stable per-event ids; both also let us fall back to the `paymentReference` if the primary id is missing (defensive, shouldn't trigger).

The order/tab status-history entries we already write serve as the per-payment audit trail; the new `ProcessedWebhookEvent` rows are the per-delivery audit trail (one row per HTTP request the provider issued).

## Security considerations

- **Order of operations matters.** The idempotency check runs **after** signature verification — so an attacker can't pre-populate the table with chosen event-ids by spoofing requests; the provider's HMAC has to validate first.
- **No new external attack surface.** Both routes' attack surface (POST endpoint) is unchanged; we're tightening behaviour, not loosening it.
- **No new auth/RBAC surface.** No new endpoint, no role change.
- **Logging discipline.** Replay attempts log at `console.warn` with the `[REQ-049]` prefix + the event-id + payment-reference, so abuse patterns are visible in Railway logs without spilling sensitive data.
- **Signature-verification hardening** (provider HMAC freshness, replay-window, nonce) is **explicitly out of scope** for REQ-049 (assumed already in place; if I find a gap during implementation, that becomes its own follow-up, not a silent expansion of this fix).

## Dependencies

- New MongoDB collection (`processed_webhook_events`) — created on first insert; no migration needed.
- Internal services/models only. **No external npm dependencies** introduced.

## Test scope (HIGH → unit + integration + abuse; e2e n/a per Phase-0 read)

Vitest, fully mocked per `__tests__/services/*.test.ts` convention.

### Unit

`__tests__/lib/webhook-idempotency.test.ts`

- `recordWebhookEvent` returns `'new'` on first create.
- Returns `'duplicate'` when the create throws `{ code: 11000 }`.
- Rethrows on any other error (asserts a non-11000 error propagates).
- Distinct providers with the same `eventId` both return `'new'` (namespace isolation — the unique index is compound).

### Integration — both webhook routes

`__tests__/api/webhooks/paystack-idempotency.test.ts`

- Two `charge.success` events with the same `data.id` → first proceeds, second is a no-op (assert: `InventoryService.deductStockForOrder` called once, `RewardsService.calculateReward` called once, response 200 both times).
- Invalid signature → 401 (regression — confirm we didn't break the existing path).
- Non-`charge.success` event → 200 ignore (regression).

`__tests__/api/webhooks/monnify-idempotency.test.ts`

- Mirror: two PAID events with same `transactionReference` → first proceeds, second is a no-op.
- Failed-payment event re-delivered → second is a no-op (status guards already idempotent, but the dedup runs first).

### Abuse / negative

- **Replay attack:** assert 10 sequential duplicates of a signed event yield exactly one side-effect set + 10 × HTTP 200.
- **Concurrent replay:** two simultaneous deliveries (race) — mock the model to simulate one `'new'` and one `11000`, assert the loser returns early without side-effects. (No real DB race needed; the integration-test mock simulates the duplicate-key path.)

### Gates (all required)

`tsc --noEmit` · `eslint` · `vitest run` · `semgrep scan --config auto` · `npm audit --audit-level=high`.

## Threat model (STRIDE) — HIGH

| Category                   | Threat                                               | Mitigation                                                                                                                                                           |
| -------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S**poofing               | Attacker forges webhook to claim a payment occurred. | **Pre-existing**: provider HMAC signature verification (raw-body check, unchanged).                                                                                  |
| **T**ampering              | Attacker modifies payload mid-flight.                | Same: HMAC over the raw body.                                                                                                                                        |
| **R**epudiation            | Provider denies sending an event.                    | This change **adds** the per-delivery `ProcessedWebhookEvent` audit row (event id + timestamp + provider) — improves repudiation posture.                            |
| **I**nformation disclosure | Webhook response leaks data.                         | Replay path returns `{ message: 'Event already processed' }` — no PII, no transaction details. Unchanged from baseline for normal path.                              |
| **D**enial of service      | Attacker floods with replays.                        | This change reduces blast-radius (each duplicate is now constant-time: one DB write attempt, no business logic). Rate-limiting / WAF remain platform-level concerns. |
| **E**levation of privilege | Webhook grants privileges it shouldn't.              | n/a — the endpoints don't change auth/role state.                                                                                                                    |

**Primary threat closed:** replay-induced value leak (rewards re-issued on duplicate delivery).

## Four-eyes attestation (HIGH — required slot)

- **Submitter:** `@ostendo-io` (skill-trigger user, this implementation cycle).
- **UAT Reviewer:** `@<TO-BE-NAMED>` — per the project's `approval.mode: dual_actor` (`sdlc-config.json`), the portal-side approver MUST differ from the submitter for HIGH-risk releases.
- **Control-gap consideration:** if only `@ostendo-io` is available, the dual-actor four-eyes is not substantively satisfied (the approver and submitter are the same human, with the AI in between). Two paths to resolve before Phase 4:
  - (a) **Nominate a second human reviewer** — preferred; closes the gap properly.
  - (b) **Accept the control gap** with the same documented-acceptance pattern as REQ-042..045 (`PRE-ONBOARDING BASELINE … control gap accepted per risk-register R-001`). For an ongoing same-actor four-eyes, that needs a fresh entry in the risk register, not a one-off note.

The skill enforces this at Phase 4: if the configured reviewer matches the trigger user, it halts with a configuration error rather than proceeding past the UAT gate.

## Rollback plan

- **Code rollback:** revert the release merge commit on `main`. Both routes return to current (pre-REQ-049) behaviour; the replay vulnerability returns until a re-implementation lands. ETA: ~5 min (revert PR + Railway auto-deploy).
- **Data rollback:** the `processed_webhook_events` collection is harmless if unused — leave it in place by default. If a fresh state is needed: `db.processed_webhook_events.drop()` against the prod DB (requires explicit authorisation per the project's `feedback_no_prod_db_touches` rule).
- **Trigger for rollback:** prod smoke fails after deploy, OR observed legitimate webhook deliveries are being mis-classified as duplicates. The replay-warn logs make the latter easy to detect.
- **Communication:** the `[INCIDENT]` defect-issue path (per the skill's Phase 5 rollback contract).

## Out of scope

- **P0 #5** (comms-prefs enforcement) — deferred until WA-2.
- **Refund flow** (P3 #18) — separate.
- **Provider signature-verification hardening** — assumed in place.
- **Rate-limiting / WAF** for the webhook endpoints — platform-level concern, not REQ-049.
