# AI Prompts — REQ-049

**Requirement:** REQ-049 — Webhook idempotency guard (Paystack + Monnify)
**Date:** 2026-05-28

Driven through the `sdlc-implementer` skill (DevAudit-Installer v0.1.20). The operator-facing prompts that initiated each phase:

## Pickup-time Workflow Triage (Phase 0)

> `implement issue #166 under the SDLC`

Skill fetched #166, read labels + title (`fix:`) + body. Inference-first classification: tracked Bug-fix; risk **HIGH** (payments + external surface + financial side-effects per `Test_Policy.md`); mapped to `change-workflows.md` row 2 (Bug fix → tracked → Stages 1–5). Announced the **Workflow Decision** block; wrote back `type:fix` and `risk:high` labels; paused for operator confirmation.

## Phase 1 — Plan

> `proceed`

Skill ran Phase 1: confirmed scope, code-walked both webhook routes, identified the **real** value-leak (rewards unguarded; inventory partially guarded), assigned **REQ-049**, wrote `compliance/plans/REQ-049/implementation-plan.md` with HIGH-required sections (STRIDE threat model, four-eyes attestation slot, rollback plan), updated RTM, posted plan summary to #166. **Paused at the HIGH-mandatory Phase-1 plan-approval checkpoint** (skill-enforced per compliance constraint 3).

## Phase 2 — Implement + tests

> `proceed`

Skill ran Phase 2:

- Branched `feat/REQ-049-webhook-idempotency-guard` off develop.
- Wrote 12 vitest cases first (tests-first per operator standing rule).
- Implemented `ProcessedWebhookEvent` model + interface, `lib/webhook-idempotency.ts` helper, route wires in both webhook handlers.
- Ran local gates (all green).
- Committed in 2 logical commits (`docs(compliance):` plan + RTM; `fix: [REQ-049]` impl + tests) with `Ref: REQ-049` + `Co-Authored-By: Claude` trailers.
- Pushed; opened **PR #167** with `[REQ-049]` in the title (per the `feedback_pr_title_req_brackets` lesson learned from REQ-048's #163 attribution-fix follow-up); merged to develop at `2a1dac8`.
- `derive-release-version.sh` correctly resolved the develop-push to `REQ-049` ✓ — CI Pipeline uploaded `security_scan` / `ci_pipeline` / `test_report` evidence under `--release REQ-049`. No #163-style attribution-fix follow-up needed.

## Phase 3 — Evidence (this pack)

> _(continuation after Phase 2 merge)_

Skill wrote this evidence pack; will PR it to develop, then open the develop→main release PR for Phase 4 (UAT four-eyes).

## Notes / standing rules in force

- Tests before push: 12 cases written first, all green before commit.
- No `--no-verify`: husky lint-staged ran cleanly on all 3 commits this turn.
- PR title `[REQ-XXX]` brackets convention: applied to PR #167 → no attribution-fix needed.
- Batch pushes: the integration PR #167 carries both plan/RTM + impl + tests in two logical commits, single push.
- Plan review for HIGH: Phase-1 checkpoint was the explicit gate; user approved before any code.
- HIGH four-eyes posture: deferred to Phase 4 (release PR) per the skill's enforcement contract.

## Sub-skill invocations

None this REQ. The plan and Phase-0 read both agreed that `e2e-test-engineer` is not applicable (webhooks have no UI surface; integration-level replay/abuse coverage instead).
