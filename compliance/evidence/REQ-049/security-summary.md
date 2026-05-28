# Security Summary — REQ-049

**Requirement:** REQ-049 — Webhook idempotency guard (Paystack + Monnify)
**Date:** 2026-05-28
**Risk Level:** HIGH

## Threat closed

**Replay-induced value leak.** Pre-REQ-049, a signature-valid webhook delivery (provider retry, manual retrigger, or attacker replay if HMAC verification ever drifted) re-ran `RewardsService.calculateReward`, `TabService.markTabPaid`, and tab-side inventory deduction with no idempotency guard. The new `(provider, eventId)` unique-index dedup makes every duplicate delivery a constant-time no-op.

Order-side inventory was already partially guarded by `order.inventoryDeducted`; the headline gap was loyalty rewards being re-issued — revenue-leak grade and exactly the gap #117 P0 #1 calls out.

## Full STRIDE threat model

See `compliance/evidence/REQ-049/implementation-plan.md` § _Threat model (STRIDE)_ — table covers all six categories. The primary closures are:

- **D**enial of service — replay cost falls to one indexed insert attempt; no business-logic runs.
- **R**epudiation — the per-delivery `ProcessedWebhookEvent` row (provider + event id + `receivedAt`) gives an audit trail per HTTP request, complementing the existing per-payment status-history entries.

## Gate posture

| Gate                               | Result                                                                                                      |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Semgrep (SAST, `--severity ERROR`) | **0 findings on REQ-049 code.** 4 pre-existing findings on DevAudit-generated workflow files are unchanged. |
| `npm audit --audit-level=high`     | 0 high/critical.                                                                                            |
| TypeScript (`tsc --noEmit`)        | Clean — no `any` introduced, the duplicate-key check is typed via a narrow `unknown → has code` predicate.  |
| ESLint                             | 0 errors on changed files.                                                                                  |

## Order-of-operations discipline

The dedup runs **after** the provider's HMAC signature verification and the cheap event-type filter (Paystack's `charge.success`), and **before** any side-effect. Two consequences:

1. An unsigned/spoofed request cannot poison the dedup table.
2. Side-effect-free events (Paystack `charge.failed` etc.) don't bloat the table.

## Logging discipline

Replay attempts log at `console.warn` with the `[REQ-049]` prefix + the event-id + payment-reference. No PII, no signed-body content. Visible in Railway logs without spilling sensitive data — useful for abuse detection and provider-retry diagnostics.

## Out of scope (explicit, security-relevant)

- Provider HMAC freshness / replay-window / nonce hardening — assumed in place; if a gap surfaces in implementation, it's a separate follow-up.
- Rate-limiting / WAF on the webhook endpoints — platform-level.

## Dependencies (security-relevant)

- **No new external npm dependencies** introduced — the scheduler-mechanism principle from REQ-048 (`setInterval` over `node-cron`) carried forward: keep the audit/SBOM surface flat.
- **No new endpoint** — the existing webhook POST surfaces are unchanged; only their internal behaviour tightens.
- **No auth/RBAC changes.**
