# Release Ticket: REQ-129 — Table and event booking (WA-13)

**Status:** IN PROGRESS
**Date:** 2026-11-27
**Requirement ID:** REQ-129
**Risk Level:** MEDIUM
**Issue:** [#975](https://github.com/metasession-dev/wawagardenbar-app/issues/975) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953)); supersedes [#218](https://github.com/metasession-dev/wawagardenbar-app/issues/218)
**Implementation branch:** `feat/bundle-wa13-bookings-support-link` (declared bundle, core REQ with REQ-130)
**Absorbed predecessor releases:** None

## Summary

Details, acceptance criteria and risks: `compliance/plans/REQ-129/implementation-plan.md`.

Stage 3 evidence is in `compliance/evidence/REQ-129/`; the UAT pack for the whole bundle is on REQ-129.

## Sign-off (dual-actor)

To be completed at Stage 3.

## Bundled Changes

- **Core tracked release:** `REQ-129`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-129.json`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-130
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** REQ-129 and REQ-130 were declared as one bundle at planning time and ship through one integration PR and one UAT.
- **Why bundled here (detail):** both add one entry to `components/features/admin/dashboard-nav.tsx` (accepted by the operator, 2026-11-27); REQ-129 is MEDIUM and REQ-130 is LOW, so the bundle runs at MEDIUM.
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is on REQ-129.
- **Reviewer impact:** approval covers both REQs.
- **Security / risk impact:** see `compliance/evidence/REQ-129/security-summary.md` and R-85 to R-87.
- **Reference:** commit range `origin/main..HEAD`
