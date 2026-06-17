# REQ-081 - Security summary

**Requirement ID:** REQ-081
**Risk:** MEDIUM
**Date:** 2026-06-15

## Scope

REQ-081 changes category navigation/filtering for express order creation, menu management, and sellable inventory management. It does not change authentication, authorization, payments, stock deduction, schemas, secrets, or dependency versions.

## Threat model

| Threat                 | Surface examined                                           | Verdict                                                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spoofing               | Admin dashboard access to order/menu/inventory pages.      | Existing dashboard auth/RBAC remains unchanged.                                                                                                                         |
| Tampering              | Client-supplied category and search filters.               | Mitigated by server-side filtering on `kind:'menu-item'`, `isAvailable`, `mainCategory`, and `category` for express search; admin table filtering is presentation-only. |
| Repudiation            | Category navigation itself.                                | No new auditable mutation. Existing create/edit/order actions keep their existing audit behavior.                                                                       |
| Information disclosure | Broader item search results.                               | No new customer/personal data fields; express results remain admin-authenticated and sellable-item constrained.                                                         |
| Denial of service      | Valid items hidden by stale or incorrect category cascade. | Tracked by R-005 and mitigated by source-of-truth category data, empty states, and automated cascade/back-navigation coverage.                                          |
| Elevation of privilege | Permissions on menu/inventory/order pages.                 | No permission changes; existing gates remain.                                                                                                                           |

## Dependency audit

No new packages were added by REQ-081. Dependency audit remediation was performed in commit `fe509db`:

- Ran `npm audit fix` to apply automated patches.
- Added package overrides for:
  - `form-data >=4.0.4`
  - `ws >=8.20.2`
- `ws` now resolves to `ws@8.21.0`.
- Audit findings reduced from 13 vulnerabilities to 3 moderate issues.
- Remaining issue: PostCSS@8.4.31 nested under `next@16.2.9` reports "No fix available" (top-level postcss is patched at 8.5.15).
- All tests passed (131 test files, 1234 tests) and lint completed with 0 errors after remediation.

## SAST

No dynamic code execution, raw HTML injection, or new external input sink is introduced. CI SAST remains the authoritative gate.

## Access control and audit logging

Access control: unchanged. Existing dashboard route gates and server-action auth checks remain in place.

Audit logging: unchanged. Category navigation is read-only; existing create/edit/order actions retain current audit behavior.

## Framework attribution

| Clause                                    | Coverage                                                                   |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| ISO 27001 A.8.25 Secure SDLC              | Threat model, risk entry R-005, and CI Quality Gates.                      |
| GDPR Art. 25 Data protection by design    | N/A - no additional personal data processing.                              |
| EU AI Act Art. 11 Technical documentation | AI use recorded in `ai-use-note.md` and `ai-prompts.md`; no runtime AI.    |
| ISO 29119 Section 3.4 Test Plan           | Covered via `test-plan.md`, `test-scope.md`, and future execution summary. |

## Risk register

- **R-005** — Category cascade hides valid sellable items or disrupts express order context.

## Sign-off

- **Author:** OpenAI Codex - 2026-06-15
- **Reviewer:** pending human review on PR for #387
