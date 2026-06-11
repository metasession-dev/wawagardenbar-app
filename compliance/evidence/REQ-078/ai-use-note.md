# REQ-078 — AI use note

**Requirement ID:** REQ-078
**Risk:** LOW
**Date:** 2026-06-11

## AI involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI)
- **Triage:** Operator asked "how is the inventory reconciliation job controlled — is that done in the dashboard somewhere?". Agent surfaced the in-process scheduler at `lib/scheduled-jobs.ts:135-136` + the absence of any admin/env control, and proposed three options ranked by effort: (1) env-var gate (~15 min REQ); (2) full SystemSettings + admin UI promotion (proper fix, REQ-sized); (3) comment-out + redeploy (not recommended).
- **Choice:** Operator chose (1) — the 1-file env-var gate.
- **Sub-skills invoked:** None. LOW risk + unit-only put this REQ on the SoT-alignment trio's `stage_1_min_risk_class: MEDIUM` skip path. `e2e-test-engineer` not invoked — no `e2e/**/*.spec.ts` files touched.
- **Operator actions this cycle:** confirmed Phase 0 triage as a tracked LOW-risk REQ; reviewed + merged PR #370.

## Honest limitations

- **Single in-code reader.** The gate is read once at server boot. Toggling the env var at runtime requires a service restart — not a hot reload. Documented in implementation-plan.md §Verification §4 + flagged again in this REQ's release-ticket operator-path section.
- **Strict literal `'true'` only.** Common-but-different values do not gate: `'TRUE'`, `'1'`, `'on'`, `'yes'`, `true` (boolean coerced via `Boolean()`) all fail to disable the job. The unit tests pin three of these (`'false'`, `'1'`, `'arbitrary'`). The operator's documented path is the exact string `true` set in the Railway env-vars panel.
- **No SystemSettings field, no admin UI toggle.** Operator-only operational lever — kitchen-display staff / non-super-admins cannot disable it. This is the deliberate trade-off: the env var lives at the deploy-control boundary, not in the application surface. The proper admin-UI promotion is a separate REQ when needed.
- **Both reconciliation passes are gated together.** `runInventoryReconciliationJob` runs (1) `InventoryService.reconcileMissedDeductions` (re-attempt deduction) AND (2) `OrderService.scanStalePaidOrders` (flag stale orders as IncidentEvents). The env var disables BOTH. Justified in test-scope.md "Out of scope": separating them doubles the operator-facing surface for no current need.

## Framework attribution

This artefact uploads with `evidence_type=ai_use_note`. Per META-COMPLY's `framework-registry-auditor` v1 review, clause attribution is **orphan-by-design** in v1 — visible in the portal Documents tab + audit-pack export. Phase B will pair the evidence type with `EUAIA.Art-11` (Technical documentation) attribution once the auditor's framework-registry update ships.

## Refs

- Implementation plan: [`implementation-plan.md`](./implementation-plan.md)
- Related: [`ai-prompts.md`](./ai-prompts.md) — operator prompts + decision log
