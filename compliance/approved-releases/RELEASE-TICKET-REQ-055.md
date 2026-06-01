# Release Ticket: REQ-055 — NotificationLog persistent audit log

**Status:** RELEASED
**Date:** 2026-06-01
**Requirement ID:** REQ-055
**Risk Level:** LOW-MEDIUM
**GitHub Issue:** [#117 WA-5](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** [#226](https://github.com/metasession-dev/wawagardenbar-app/pull/226) — merged to develop 2026-06-01 (commit `6240a08`).
**Release PR:** [#227](https://github.com/metasession-dev/wawagardenbar-app/pull/227) — merged to main 2026-06-01 (commit `fa7df86`); **normal merge** — no admin override, all 6 required gates green (Compliance Validation, DevAudit Release Approval, Quality Gates, Register Release, Upload Compliance Evidence, Upload Evidence, Railway UAT). Develop branch preserved per the saved memory (no `--delete-branch` on release PR).
**DevAudit Release:** [`devaudit.metasession.co/projects/wgb/`](https://devaudit.metasession.co/projects/wgb/) — release version `REQ-055`, status `released`.
**Sign-off (dual-actor):** UAT approved + Production approved on the DevAudit portal (`released`); post-deploy production smoke evidence captured via [`post-deploy-prod.yml` run 26756912246](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26756912246). Closed out 2026-06-01.

---

## Summary

Third code item in #117's WhatsApp expansion bundle (WA-5). Adds a persistent audit trail to REQ-054's `NotificationService.send` orchestrator. Every outbound attempt becomes a row; Meta's delivery-status webhook events update the row's `status` (queued → sent → delivered → read; failed terminal).

Closes the **"why didn't I get the message?"** forensics gap and provides the data backing SMS-fallback cost sizing.

**Scope-shrink note:** the webhook route at `app/api/webhooks/whatsapp/route.ts` and Meta's signature verification were already in place. REQ-055 only adds the persistence layer (model + service) and two thin wire-ups (REQ-054's `logAttempt` → `recordAttempt`; existing `lib/whatsapp.ts:handleWebhook` status branch → `updateStatus`).

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** implementation plan with STRIDE + threat model + rollback, the `NotificationLog` Mongoose model + indexes + lifecycle constant, the `NotificationLogService` (`recordAttempt` + `updateStatus` with monotonic filter), two thin wire-ups in REQ-054's service + `lib/whatsapp.ts:handleWebhook`, 19 new vitest cases (6 model + 10 service + 3 integration), full REQ-055 compliance markdown. See `compliance/evidence/REQ-055/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this turn:** approved the implementation plan at the LOW-MEDIUM-risk checkpoint. Will perform Phase 4 portal UAT approval + Phase 5 Production approval after CI green on develop → main.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

- **`models/notification-log-model.ts` (new, ~80 LOC)** — Mongoose schema with `templateKey` / `userId` (string-or-null) / `channel` (enum) / `success` / `messageId` (sparse-indexed) / `status` (enum, default `'queued'`) / `failureReason` / `durationMs` / `attemptedAt`. Compound indexes for user-recent and message-id lookups + admin recent-failures. Exports `NOTIFICATION_LOG_STATUS_ORDER` lifecycle map.
- **`services/notification-log-service.ts` (new, ~110 LOC)** — `recordAttempt({...})` writes a new doc; `updateStatus(messageId, status, failureReason?)` finds-and-updates with the monotonic filter (permissible source states are strictly earlier in the lifecycle; `failed` never qualifies as a source). Both methods swallow persistence errors via `console.error` / `console.warn`; never re-throw.
- **`services/notification-service.ts` (REQ-054, +~15 LOC)** — `NotificationAttempt` interface gains `messageId?`. WhatsApp branch captures Meta's `wamid`. `logAttempt` augmented to call `NotificationLogService.recordAttempt` alongside the existing `console.log`.
- **`lib/whatsapp.ts:handleWebhook` (+~25 LOC)** — status-event branch additionally calls `NotificationLogService.updateStatus` via a lazy import (avoids the lib→services→lib circular).
- **No new packages, no env vars, no DB migration.**
- **Evidence pack (Stage 3, this commit):** test-scope / test-plan / test-execution-summary / security-summary / ai-use-note / ai-prompts / implementation-plan + this release ticket.

## Verification

- `npx tsc --noEmit` → exit 0.
- `npx vitest run` (full suite, feat branch HEAD) → **936 pass / 4 skipped / 0 fail** (+19 new REQ-055 cases).
- `npx eslint <changed>` → 0 errors. (8 `no-console` warnings on intentional v1 observability lines; carry-over pattern from REQ-054.)
- `npm audit --audit-level=high` → 0 high / 0 critical.
- Semgrep (`--config auto`) → 0 findings on the 4 changed files.
- E2E focused → **n/a** per `project_e2e_targeted_until_117` policy AND scope justification (server-side persistence; unit + integration boundary is load-bearing).

## Residual Risk

- **Unbounded retention** — `NotificationLog` grows without TTL or admin purge. Future REQ when storage cost matters or compliance retention windows are formalised.
- **No admin UI** — querying the log requires DB access today. Future REQ for a `/dashboard/notifications` page.
- **Lazy import in `handleWebhook`** — works but is a code smell. Cleaner long-term resolution: move `NotificationLogService` to `lib/` or invert the dependency. Acceptable v1.

## Rollback Plan

`git revert <merge-sha>` on the release-PR merge → removes the new model, service, and the two wire-ups. The `NotificationLog` collection persists in Mongo (harmless orphan). REQ-054's `console.log` lines continue firing as the observability fallback. No data loss; no schema change.

## Cross-Reference

- Parent backlog item: **#117 WA-5**.
- Depends on: **REQ-054** (`NotificationService.send` + `logAttempt`).
- Cross-references: existing `app/api/webhooks/whatsapp/route.ts` (Meta signature verification; not modified).
- Unblocks: **WA-3** (inbound-message state-machine routing slots into the same `handleWebhook` file), admin audit-log UI (future REQ), retention/TTL policy (future REQ).
