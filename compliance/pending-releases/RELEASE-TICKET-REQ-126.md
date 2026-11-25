# Release Ticket: REQ-126 — WhatsApp "order" gets the menu link; status enquiries raise an urgent ticket (WA-16)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-11-25
**Requirement ID:** REQ-126
**Risk Level:** MEDIUM
**Issue:** [#1084](https://github.com/metasession-dev/wawagardenbar-app/issues/1084) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953))
**Implementation branch:** `feat/bundle-wa15-wa16-checkout-fix` (declared bundle with REQ-125, whose release ticket is the core of the bundle)
**Absorbed predecessor releases:** None

## Summary

Details, acceptance criteria and risks: `compliance/plans/REQ-126/implementation-plan.md`.

Stage 3 evidence is in `compliance/evidence/REQ-126/`; the UAT pack for the whole bundle is on REQ-125. Local gates (tsc, lint, 2348 unit tests) and the new e2e specs plus 22 related existing spec files pass; CI runs the full `smoke` and `critical` tiers on the PR.

## Sign-off (dual-actor)

To be completed at Stage 3.

## Bundled Changes

- **Core tracked release:** `REQ-125`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-125.json`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-126, REQ-127
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** REQ-125, REQ-126 and REQ-127 were declared as one bundle at planning time and ship through one integration PR and one UAT.
- **Why bundled here (detail):** no overlapping files; all MEDIUM.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is on REQ-125.
- **Reviewer impact:** approval covers all three REQs.
- **Security / risk impact:** see `compliance/evidence/REQ-126/security-summary.md` and R-77 to R-80.
- **Reference:** commit range `origin/main..HEAD`
