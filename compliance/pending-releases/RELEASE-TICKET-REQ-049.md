# Release Ticket: REQ-049 — Webhook idempotency guard (Paystack + Monnify)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-05-28
**Requirement ID:** REQ-049
**Risk Level:** HIGH
**GitHub Issue:** [#166](https://github.com/metasession-dev/wawagardenbar-app/issues/166)
**Integration PR:** [#167](https://github.com/metasession-dev/wawagardenbar-app/pull/167) — merged to develop `2a1dac8` (2026-05-28).
**Release PR:** Will be linked when the develop → main PR is created.
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-049`)

---

## Summary

Closes the **replay → re-issue-rewards value leak** in the two payment webhook routes (#117 P0 #1). A duplicate signature-valid delivery (provider retry, manual retrigger, or attacker replay if HMAC ever drifted) used to re-run `RewardsService.calculateReward`, `TabService.markTabPaid`, and tab-side inventory deduction. Now: every duplicate is a constant-time no-op returning HTTP 200.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** Plan, new `ProcessedWebhookEvent` model + interface, `lib/webhook-idempotency.ts` helper, route wires in both webhook handlers, 12 vitest cases (4 unit + 5 Paystack integration + 3 Monnify integration), full REQ-049 compliance markdown. See `compliance/evidence/REQ-049/ai-prompts.md` and `ai-use-note.md` for full provenance.
- **Human Reviewer:** Operator approved the plan at the HIGH-mandatory Phase-1 checkpoint (skill-enforced). Stage 4 `dual_actor` approver (independent of submitter) is the next gate — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

- **New files:**
  - `interfaces/processed-webhook-event.interface.ts` — `IProcessedWebhookEvent` + `WebhookProvider` type.
  - `models/processed-webhook-event-model.ts` — Mongoose schema with compound unique index on `(provider, eventId)` (the load-bearing dedup control).
  - `lib/webhook-idempotency.ts` — `recordWebhookEvent({provider, eventId, …}) → 'new' | 'duplicate'`; uses MongoDB E11000 for race-safe dedup.
- **Wired into:**
  - `app/api/webhooks/paystack/route.ts` — dedup after the `charge.success` filter + `connectDB`, before order/tab lookup + side-effects.
  - `app/api/webhooks/monnify/route.ts` — dedup after `connectDB`, before order/tab lookup + side-effects.
- **Tests:**
  - `__tests__/lib/webhook-idempotency.test.ts` (4 cases) — unit on the helper.
  - `__tests__/api/webhooks/paystack-idempotency.test.ts` (5 cases) — integration incl. 10-replay abuse + unsigned-request regression.
  - `__tests__/api/webhooks/monnify-idempotency.test.ts` (3 cases) — integration mirror.
- **Evidence pack (Stage 3, this commit):** test-scope / test-plan / test-execution-summary / security-summary / ai-use-note / ai-prompts / implementation-plan + this release ticket.

## Verification

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` (full suite, develop @ `2a1dac8`) → **858 pass · 0 fail · 4 skip**.
- `npx eslint <REQ-049 files>` → 0 errors.
- `semgrep scan --config auto --severity ERROR` → **0 findings on REQ-049 code** (4 pre-existing findings on DevAudit-generated workflow files are unchanged).
- `npm audit --audit-level=high` → 0 high/critical.
- E2E: N/A by scope (webhooks have no UI surface; integration-level replay/abuse coverage instead).
- CI Pipeline ran on the develop-push merging `2a1dac8` — derive-release-version.sh correctly returned `REQ-049` (PR title used `[REQ-049]` brackets); gate evidence uploaded to DevAudit at `environment=uat` under `--release REQ-049`. No #163-style attribution-fix follow-up needed.

## Residual Risk

- **Single-instance assumption** does not apply (unlike REQ-048's scheduler): the unique-index dedup is at the MongoDB layer, so multiple Railway replicas all observe the same dedup state.
- **Sig-verification hardening** out of scope — assumed in place. If a gap surfaces in implementation/UAT, separate follow-up.
- **Rate-limiting / WAF** out of scope — platform-level. REQ-049 reduces blast radius but doesn't add throttling.
