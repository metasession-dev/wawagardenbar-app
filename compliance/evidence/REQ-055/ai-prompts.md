# REQ-055 — AI prompts log

**Date:** 2026-06-01

## Session prompts (user → AI)

1. Meta restriction context (prior turn): the Wawagardenbar Meta Business Account hit a "Your business is restricted" alert blocking template management; user opened a Meta support ticket and chose to pivot to non-WhatsApp-template-dependent #117 work in parallel.

2. _(AI surfaced REQ-055 plan with ACs, scope-shrink notice [webhook route + signature verification pre-exist], STRIDE table.)_

3. `Proceed as planned (Recommended)`
   - Plan approval at the LOW-MEDIUM-risk gate. AI proceeded with TDD-first implementation.

## Internal AI prompts (orchestrator → sub-skills)

No sub-skills were invoked for REQ-055. The work is server-side persistence + two thin wire-ups; no e2e author work needed (per the `project_e2e_targeted_until_117` policy AND per the scope justification — orchestrator unit boundary covers the surface). `sdlc-implementer` ran end-to-end; `e2e-test-engineer` was not invoked.

## Decision points

- **Webhook route + signature verification already exist** — scope shrank from "build the whole webhook stack" to "wire two callers to the new persistence layer + provide the model/service". The existing route at `app/api/webhooks/whatsapp/route.ts` carried this through; no changes there.
- **Monotonic status filter** — chose `{ $in: [permissible-source-states] }` over a positional comparison op so the filter is declarative and visible at query time. The source-state set excludes `failed` entirely (terminal) and the target state itself (no-op).
- **Lazy import in `lib/whatsapp.ts:handleWebhook`** — avoids the lib→services→lib circular that a top-of-file import would create. The `try/catch` around the lazy import covers misconfigured environments without breaking the webhook ACK.
- **Lifecycle ordering as exported constant** — `NOTIFICATION_LOG_STATUS_ORDER` is exported from the model so the service can read it without re-declaring. The test mock has to provide it explicitly (one-line addition); discovered during the TDD red→green cycle.
- **`messageId` augmented on `NotificationAttempt`** — REQ-054's interface already carries `channel`, `success`, `error`, `durationMs`; added `messageId?` rather than changing the interface signature. Captured only on the WhatsApp branch.
- **Persistence errors swallowed in BOTH methods** — the send path (REQ-054) and the webhook ACK (existing route) must not break because audit logging fell over. Tests cover both error paths explicitly.

## Audit cross-refs

- Parent backlog: #117 (`WA-5`).
- Direct dependency: REQ-054 (`NotificationService.send` + `logAttempt`).
- Cross-reference: existing `app/api/webhooks/whatsapp/route.ts` (untouched by REQ-055; verified by reading) provides the signature-verification surface.
- Project memory honoured: `feedback_sdlc_impl_plan_review`, `feedback_tests_before_push`, `feedback_single_pr_default`, `project_e2e_targeted_until_117`, `feedback_no_delete_develop_on_release_merge`.
- Unblocks future work: WA-3 (inbound-message state machine in the same `handleWebhook` file), admin audit-log UI, retention/TTL policy.
