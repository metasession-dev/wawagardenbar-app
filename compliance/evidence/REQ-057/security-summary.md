# REQ-057 — Security summary

**Requirement ID:** REQ-057
**Risk class:** LOW
**Surface:** `models/reward-rule-model.ts` (schema defaults + pre-validate hook), `app/actions/profile/profile-actions.ts` (exported `instagramHandleSchema` pipe), `components/features/profile/personal-info-tab.tsx` (mirror import + explainer copy).

## STRIDE assessment

| Category                | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No               | Profile updates go through the existing session-gated server action; no new auth surface. Reward rule mutations remain admin-only.                                                                                                                                                                                                                                                                                          |
| **T** — Tampering       | **Reduces risk** | The tighter Instagram-handle regex (`^[a-zA-Z0-9._]{1,30}$`) blocks injection-shaped strings that the previous `.max(30)` admitted (e.g. `<script>` was previously written verbatim to the user doc). The transform + refine pipe shared between client and server eliminates client-trust assumptions. Paired-validity hook prevents half-state cadence config from corrupting downstream `processInstagramRewards` logic. |
| **R** — Repudiation     | No               | Existing audit log on `user.update` action keeps capturing `fields` updated; no behaviour change.                                                                                                                                                                                                                                                                                                                           |
| **I** — Info disclosure | No               | No new data persisted; Instagram handle was already collected via the existing profile form. Instagram usernames are public identifiers by design.                                                                                                                                                                                                                                                                          |
| **D** — DoS             | No               | Pre-validate hook is constant-time on each rule write; reads a small subdoc. Zod regex is bounded by `.max(30)`.                                                                                                                                                                                                                                                                                                            |
| **E** — Elevation       | No               | No role / permission change.                                                                                                                                                                                                                                                                                                                                                                                                |

## Threat model — Instagram handle attack surface

The IG handle is a customer-supplied string persisted on `User.socialProfiles.instagram.handle`. Failure modes considered:

1. **Stored XSS via crafted handle** — pre-REQ-057, `<script>alert(1)</script>` would pass `.max(30)` (29 chars) and persist to Mongo. Render paths that don't HTML-escape would execute. The new regex `^[a-zA-Z0-9._]{1,30}$` rejects this entirely at the validation boundary. Defense-in-depth: the existing React render escape would have caught DOM-side injection too, but the regex is the load-bearing prevention.

2. **NoSQL injection via handle** — handle is passed to Mongoose as a value (`socialProfiles.instagram.handle: string`), not an expression. Even with the old loose `.max(30)`, operator-shaped strings (`{ $gt: '' }`) couldn't escape the string-typed field. The new regex closes any residual concern.

3. **Handle impersonation** — a user could set `nasa` as their handle today. The `verified: false` field defaults stamp signal "not yet verified by IG Graph API call" — IG-3 (future REQ) will verify handles against real IG ownership via the Graph API. REQ-057 doesn't gate this; it only ensures the handle's _shape_ is plausible.

4. **Half-set cadence corruption** — pre-REQ-057, an admin could persist `socialConfig: { postsRequired: 3 }` without `windowDays`, then the future IG-4 processor would have undefined behaviour (NaN window calculations). The pre-validate hook prevents this state from entering the DB. Defaults reduce the operator-input requirement to zero for the common case.

5. **Mongoose `validateSync()` silently skipping the hook** — a real concern uncovered during TDD. `validateSync()` does NOT run `pre('validate')` middleware. Real-world rule writes use `.save()` (async) which DOES run the hook. The tests use async `.validate()` to exercise the hook. Static analysis: no call sites in this repo use `validateSync()` on RewardRule; `RewardRulesService.create()` uses `.save()`.

## Privacy / regulatory

- No new PII collected. Instagram handle was already collected via the existing profile form.
- The handle is a public identifier (Instagram usernames are public by design); regex doesn't change exposure.
- Schema defaults on cadence fields don't create new PII; they're operator-facing config defaults.

## Static analysis

`semgrep scan --severity=ERROR models/reward-rule-model.ts app/actions/profile/profile-actions.ts components/features/profile/personal-info-tab.tsx` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. No new packages introduced.

## Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- Graph API ownership verification → IG-3 (future REQ).
- TTL / retention policy on `socialProfiles.instagram` → future REQ; no operational urgency.
- Server-side handle uniqueness check (prevent two customers claiming the same IG handle) → future REQ; cheap to add as a Mongo unique sparse index on `socialProfiles.instagram.handle`.
