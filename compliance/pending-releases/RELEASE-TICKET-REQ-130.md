# Release Ticket: REQ-130 — Dashboard: Support link in the main menu (#1087)

**Status:** IN PROGRESS
**Date:** 2026-11-27
**Requirement ID:** REQ-130
**Risk Level:** LOW
**Issue:** [#1087](https://github.com/metasession-dev/wawagardenbar-app/issues/1087) (found in UAT of REQ-125 to REQ-127)
**Implementation branch:** `feat/bundle-wa13-bookings-support-link` (declared bundle with REQ-129, whose release ticket is the core of the bundle)
**Absorbed predecessor releases:** None

## Summary

Details, acceptance criteria and risks: `compliance/plans/REQ-130/implementation-plan.md`.

Stage 3 evidence is in `compliance/evidence/REQ-130/`; the UAT pack for the whole bundle is on REQ-129.

## Sign-off (dual-actor)

To be completed at Stage 3.

## Bundled Changes

- **Core tracked release:** `REQ-129`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-129.json`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-130
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** REQ-129 and REQ-130 were declared as one bundle at planning time and ship through one integration PR and one UAT.
- **Why bundled here (detail):** both add one entry to `components/features/admin/dashboard-nav.tsx` (accepted by the operator, 2026-11-27).
- **Evidence impact:** each REQ keeps its own evidence directory; the UAT pack is on REQ-129.
- **Reviewer impact:** approval covers both REQs.
- **Security / risk impact:** none (navigation entry; access control unchanged).
- **Reference:** commit range `origin/main..HEAD`
