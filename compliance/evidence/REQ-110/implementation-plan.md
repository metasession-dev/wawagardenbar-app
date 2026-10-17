---
title: 'Implementation plan — REQ-110'
requirement_id: 'REQ-110'
risk_class: 'HIGH'
change_type: 'fix'
authored_by: 'agent'
authored_at: '2026-10-16'
---

# Implementation plan — REQ-110

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                                                                |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one.                                                 |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations (auth, data handling, dependencies, secrets).                  |
| **GDPR Art. 25** Data protection by design and by default | Per-purpose data flows; minimisation; lawful basis; retention. Explicit "no personal data" callout if not. |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | When the REQ touches AI / model behaviour. Explicit "no AI in scope" callout if not.                       |

## 1. Goal + acceptance criteria

**Goal:** Remediate the 19 unresolved npm audit high/critical advisories tracked in #910 — fix what's safely fixable now (brace-expansion, no breaking change) and migrate `nodemailer` to its patched major version (breaking API change requiring call-site review), closing both this issue and #584.

This REQ has no new or changed UI surface — it is a dependency-security remediation touching `package.json`/`package-lock.json` overrides and the internal SMTP transport module (`lib/email.ts`). Acceptance criteria are therefore expressed as verifiable system behaviour rather than user-observable UI journeys, per the LOW-risk "surface-free change" exception in the template's Surface Inventory section — applied here despite HIGH risk classification because the change is genuinely surface-free (dependency/infra fix, not a feature), not because the risk is being understated.

- **Acceptance criteria:**

| AC  | Description                                                                                                                                                                                                                                                                         | SRS item it traces to                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| AC1 | `brace-expansion` overrides for `minimatch@3.1.5`/`minimatch@9.0.9` bumped to `^1.1.21`/`^2.1.7`; `npm audit` no longer reports `GHSA-mh99-v99m-4gvg`, `GHSA-rgw5-rvv9-x895`, `GHSA-qhr7-859c-m2p7`, or `GHSA-6j4f-fj2g-mc7p` at any dependency path.                               | `@srs-deferred: dependency-version fact, not a user-observable requirement`                                        |
| AC2 | `nodemailer` upgraded from `9.1.1` to a patched `10.x` release; `npm audit` no longer reports `GHSA-v53p-9fqp-m79j` or `GHSA-prgh-xp8r-p3m5`.                                                                                                                                       | `@srs-deferred: dependency-version fact, not a user-observable requirement`                                        |
| AC3 | `sendEmail()` (`lib/email.ts`) continues to deliver mail via the same SMTP transport configuration (`SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD`) with no observable behaviour change to any caller, verified by the existing unit/integration test suite passing unchanged. | `@srs-deferred: no behavioural delta — existing email-sending requirements (none currently in SRS) are unaffected` |
| AC4 | `braces@3.0.3`'s risk acceptance (`GHSA-vfj7-8cjw-p6xm`) remains in `compliance/security/accepted-vulnerabilities.json`, re-verified as still the latest published release (no upstream fix exists yet) at implementation time.                                                     | `@srs-deferred: dependency-version fact, not a user-observable requirement`                                        |
| AC5 | `compliance/security/accepted-vulnerabilities.json` has exactly 1 exception remaining (`braces`) after this REQ — the 32 brace-expansion entries and 2 nodemailer entries are removed; #584 is closed as a duplicate/superseded root cause.                                         | `@srs-deferred: security-ledger bookkeeping fact, not a user-observable requirement`                               |

## SRS items proposed/touched

> _Populated by `requirements-aligner` (Phase 1, advisory — `block_on_stage_1: false` for this project)._

| AC  | SRS item        | Status   | Notes                                                                                                                                                                                                                                                                                                                             |
| --- | --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `@srs-deferred` | deferred | Checked `docs/SRS.md` for a dependency/security-audit area (`REQ-SEC-*`) — existing `REQ-SEC-001`/`REQ-SEC-002` cover security headers and session-cookie flags, not dependency-CVE remediation. No existing item fits; this is a pure dependency-version fact with no user-observable behaviour, so no new SRS item is proposed. |
| AC2 | `@srs-deferred` | deferred | Same rationale as AC1. No `REQ-EMAIL-*`/notification-sending area exists in the SRS describing `sendEmail()`'s contract either way — AC3 covers the "no behaviour change" side.                                                                                                                                                   |
| AC3 | `@srs-deferred` | deferred | No existing SRS item describes `sendEmail()`/`lib/email.ts`'s contract to assert "unchanged" against; nothing to trace to, and this REQ doesn't introduce new email-sending _behaviour_ that would warrant authoring one now.                                                                                                     |
| AC4 | `@srs-deferred` | deferred | Same as AC1 — tracks upstream package-release availability, not product behaviour.                                                                                                                                                                                                                                                |
| AC5 | `@srs-deferred` | deferred | Security-ledger (`compliance/security/accepted-vulnerabilities.json`) bookkeeping — compliance-process state, not a product requirement.                                                                                                                                                                                          |

**Drift check (Step 4a):** no `REQ-SEC-*` or dependency/notification-area ID collisions found; `REQ-SEC-001`/`REQ-SEC-002` appear consistently in both the summary table and heading blocks.

## 2. Scope

- **In scope:**
  - `package.json` — `overrides["minimatch@3.1.5"].brace-expansion`, `overrides["minimatch@9.0.9"].brace-expansion`, `dependencies.nodemailer`
  - `package-lock.json` — regenerated via `npm install`
  - `lib/email.ts` — review for nodemailer 10.x API compatibility; fix call sites if needed
  - `compliance/security/accepted-vulnerabilities.json` — remove the 32 brace-expansion + 2 nodemailer exception entries
  - Issue #584 — close once its two advisories are confirmed resolved
- **Out of scope:**
  - `braces@3.0.3` (`GHSA-vfj7-8cjw-p6xm`) — no patched upstream release exists; acceptance stays, re-verified not resolved
  - Any other dependency not named in #910

### Surface inventory

**Surface inventory: N/A — dependency/security remediation with no UI surface.** `lib/email.ts`'s `sendEmail()` is called from several server-side flows (account-deletion notice, order confirmations, etc.) but none of those call sites change; only the underlying `nodemailer` transport implementation is upgraded. No route, component, or user-visible flow changes as a result of this REQ.

## 3. Architecture decisions

> _Populated by `adr-author`._

- **No ADR needed** — Risk class HIGH (per `Test_Policy.md`'s security-critical-functionality bucket) is one of `adr-author`'s decision-tree signals that can force an ADR, and was explicitly examined — but the change is structurally a routine dependency patch, not an architectural decision: `brace-expansion` stays the same package via an in-range version bump through an existing `overrides` mechanism (no new dependency, no new tier), and `nodemailer` 9.1.1→10.x keeps the same transport API for this project's usage (`createTransport`/`sendMail`/`Transporter` — confirmed via the 10.0.0 changelog/release notes, whose only stated breaking change is the Node ≥20 runtime requirement, already satisfied in both CI and locally). No new third-party dependency, no new external service/database/cache/queue tier, no pattern change spanning more than one file (`lib/email.ts`). This was an ambiguous case (HIGH risk signal vs. no structural change) surfaced to the operator, who confirmed no ADR needed.

## 4. E2E test coverage

**`@e2e-deferred: No UI-facing files touched by this REQ's diff (`package.json`, `package-lock.json`, `lib/email.ts`, `compliance/security/accepted-vulnerabilities.json` only) — no e2e/visual-regression surface exists to test.`**

## 5. Threat model + security considerations

| Threat                                                                                               | Likelihood                                                        | Impact     | Mitigation                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unpatched `brace-expansion` ReDoS in dev/CI-only glob matching (`GHSA-mh99`/`-rgw5`/`-qhr7`/`-6j4f`) | Low (dev/CI-only paths, bounded resources)                        | Low-Medium | Bump to in-range patched releases (`1.1.21`/`2.1.7`) — no consumer migration needed, satisfies minimatch's own declared ranges                                                                                                     |
| `nodemailer@9.1.1` known vulnerabilities (`GHSA-v53p`/`GHSA-prgh`)                                   | Low (operator-controlled SMTP config, not user input)             | Medium     | Upgrade to patched `10.x`; review `createTransport`/`sendMail` usage against the 10.0.0 changelog (confirmed: only stated breaking change is the Node ≥20 runtime requirement, already satisfied — CI runs Node 20, local Node 22) |
| `braces@3.0.3` unpatched (`GHSA-vfj7`)                                                               | Low (dev/build-tooling chain only, not reachable from user input) | Low        | No fix available upstream; acceptance renewed, tracked in #910                                                                                                                                                                     |

**Secrets / credentials:** No change. `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` remain operator-configured env vars, untouched by this REQ.

**Dependencies introduced:** None new — this REQ only bumps existing dependency versions (`nodemailer` 9.1.1→10.x, `brace-expansion` 1.1.16→1.1.21 and 2.1.2→2.1.7 via existing `overrides`).

### Risk register entries

> _Populated by `risk-register-keeper` (risk class HIGH)._

This REQ opens one register entry and resolves two advisories outright (no register entry needed for those — they're fixed, not accepted risk):

- **R-036 — `braces@3.0.3` ReDoS advisory has no patched upstream release** — Status: ACCEPTED. Opened by `risk-register-keeper`. No fix exists upstream; the existing risk acceptance in `compliance/security/accepted-vulnerabilities.json` is renewed, review due 2026-11-15. See `compliance/risk-register.md`.
- `@risk-deferred: brace-expansion (GHSA-mh99/-rgw5/-qhr7/-6j4f) and nodemailer (GHSA-v53p/-prgh) are resolved outright by this REQ (patched versions adopted) — no residual risk to register, not an accepted-risk trade-off.`

**`solo_with_gap` check:** `sdlc-config.json:approval.mode` is `dual_actor` for this project — the Phase 4 control-gap check doesn't apply.

## 6. Data protection (GDPR Art. 25)

**Personal data processed by this REQ:** No — this REQ does not add, remove, or change what personal data `sendEmail()` transmits (recipient address, subject, HTML/text body were already parameters before this change and remain so). It only upgrades the transport library and dependency-audit risk ledger. N/A — dependency/infra fix, no data-flow change.

## 7. AI / model considerations (EU AI Act Art. 11)

**AI / ML in scope for this REQ:** No. N/A — this REQ does not introduce or change AI behaviour.

## 8. Rollback plan

- **Reversible via:** `git revert` of the merge commit on `develop`. `package-lock.json` regenerates cleanly back to the prior pinned versions; no migration or data written by the new `nodemailer` version that an older version can't read (SMTP is stateless per-send).
- **Data implications of rollback:** None — no persisted data format changes.
- **Notification path if rollback during a release:** Standard incident path — if email delivery breaks post-deploy, page on-call per the project's incident playbook; rollback restores the prior known-good `nodemailer@9.1.1` immediately.

## 9. Verification

- **Unit + integration tests:** Existing suite (`npx vitest run`) must pass unchanged (current baseline: 1498 passed, 4 skipped) after both dependency bumps. If `lib/email.ts` requires call-site changes for `nodemailer` 10.x compatibility, add/update unit coverage for `sendEmail()`/`getTransporter()`.
- **E2E coverage:** N/A — see §4.
- **Manual smoke after deploy:** Trigger one real email-sending flow (e.g. account-deletion notice) against the UAT SMTP config and confirm delivery, since automated tests mock the transport and won't catch a genuine SMTP-level incompatibility.
- **Monitoring / alerting:** None added — relies on existing error logging around `sendEmail()` call sites.

## 10. Sign-off

- **Plan reviewer (eng):** william@ostendo.io — 2026-10-16
- **Plan reviewer (security / DPO):** N/A — threat model is routine dependency-CVE remediation, no novel security surface
- **Plan approved by operator:** william@ostendo.io — 2026-10-16 (HIGH-risk checkpoint, approved via chat)

## Upload path

This file lives at `compliance/plans/REQ-110/implementation-plan.md` and is uploaded automatically on the next push to `develop` via `compliance-evidence.yml`.
