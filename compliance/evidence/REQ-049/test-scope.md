# Test Scope — REQ-049

**Requirement:** REQ-049 — Webhook idempotency guard (Paystack + Monnify)
**Risk Level:** HIGH
**GitHub Issue:** [#166](https://github.com/metasession-dev/wawagardenbar-app/issues/166)
**Date:** 2026-05-28

## What changed

The two payment webhook routes (`app/api/webhooks/paystack/route.ts`, `app/api/webhooks/monnify/route.ts`) now run an idempotency check **after** the existing HMAC signature verification and **before** any side-effect. A new `ProcessedWebhookEvent` collection with a compound unique index on `(provider, eventId)` records every delivery; the helper `recordWebhookEvent` in `lib/webhook-idempotency.ts` relies on the MongoDB duplicate-key error (code 11000) for race-safe dedup. Duplicate deliveries return HTTP 200 with no business-logic execution.

## In scope

- **`lib/webhook-idempotency.ts`** — `recordWebhookEvent`: `'new'` on first insert, `'duplicate'` on E11000, rethrow on any other error (caller becomes a 500).
- **`models/processed-webhook-event-model.ts`** — schema + the load-bearing compound unique index.
- **`app/api/webhooks/paystack/route.ts`** — dedup wired after the `charge.success` filter + `connectDB`, before order/tab lookup, inventory deduction, reward calculation, and tab close. Provider event-id = `data.id` with fallback to `data.reference`.
- **`app/api/webhooks/monnify/route.ts`** — dedup wired after `connectDB`, before order/tab lookup and side-effects. Provider event-id = `payload.transactionReference` with fallback to `payload.paymentReference`.
- **The replay-induced value leak** specifically: `RewardsService.calculateReward` + `TabService.markTabPaid` + tab-side inventory deduction. (Order-side inventory was already partially guarded by `order.inventoryDeducted`.)

## Out of scope

- **E2E coverage** — webhooks have no UI surface; covered at the integration-test level with full route invocation. The HIGH "e2e for every user-visible path" rule doesn't apply (no path is user-visible). Surfaced + agreed at Phase 0.
- **Provider HMAC freshness / replay-window / nonce hardening** — assumed in place (Paystack `validateWebhookSignature`, Monnify `validateWebhookSignature` against raw body); if a gap surfaces it becomes its own follow-up, not a silent expansion of REQ-049.
- **Rate-limiting / WAF** on the webhook endpoints — platform-level concern; REQ-049 closes blast-radius (constant-time replay) but doesn't address upstream throttling.
- **Comms-prefs enforcement** (P0 #5) — separate item, deferred until WA-2.
- **Refund flow** (P3 #18) — separate item.
