# Release Ticket: REQ-121 — One-page customer checkout (WA-06)

**Status:** RELEASED
**Date:** 2026-11-16
**Requirement ID:** REQ-121
**Risk Level:** HIGH
**Issue:** [#968](https://github.com/metasession-dev/wawagardenbar-app/issues/968) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953))
**Implementation branch:** `feat/bundle-wa-06-wa-12-checkout-staff-alerts` (declared bundle, core REQ with REQ-122)
**Absorbed predecessor releases:** None

## Summary

A signed-in customer places and pays for an order on one page that asks only what the order type needs (no stepper, no email, inline tip, saved address, typed errors inline, closed-hours block). Details, acceptance criteria and risks: `compliance/plans/REQ-121/implementation-plan.md`.

Stage 3 evidence is in `compliance/evidence/REQ-121/`; the UAT pack for the whole bundle is on REQ-121. Local gates (tsc, lint, 2129 unit tests, build, `smoke` + `critical` e2e) pass; CI runs and the full regression tier come with the integration PR.

## Sign-off (dual-actor)

- **Approval mode:** `dual_actor` (HIGH risk).
- **Change author / trigger:** the operator (William Thompson, Metasession Dev) and the AI agent (Claude Sonnet 5.5 via `sdlc-implementer`). Neither approves.
- **UAT executed by:** the AI agent (`execution_mode: agent_executed`; see `uat-execution-record.md`).
- **Independent UAT reviewer, named by the operator on 2026-11-17:** Ade Thompson. The reviewer reads the record and evidence, makes the independence declaration, ticks the reviewer decision, signs, and records the outcome and the approval in the portal under their own login. Not yet done.
- The agent does not sign, tick the reviewer decision, or approve.

## Bundled Changes

- **Core tracked release:** `REQ-121`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-121.json`
- **Manifest hash:** `sha256:39887ff8e40fa556a21c1156923d81fa7ae8c733c082f171e68062cae15ae511`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-122
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** Explicit predecessor release tickets and non-release work are consolidated under approval envelope `REQ-121`.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes the core tracked release plus the explicit predecessor releases and non-release work listed below.
- **Security / risk impact:** No additional security/risk impact identified automatically; reviewer must confirm in the canonical release artifacts.
- **Reference:** commit range `origin/main..HEAD`

### Absorbed Predecessor Releases

- None
