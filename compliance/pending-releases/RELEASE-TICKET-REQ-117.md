# Release Ticket: REQ-117 — WhatsApp-only customer sign-in (WA-04)

**Status:** PLANNED
**Date:** 2026-11-05
**Requirement ID:** REQ-117
**Risk Level:** HIGH
**Issue:** [#966](https://github.com/metasession-dev/wawagardenbar-app/issues/966) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953))
**Implementation branch:** `feat/bundle-wa-04-wa-10` (declared bundle with REQ-118; REQ-117 is the primary REQ)
**Absorbed predecessor releases:** None

## Summary

Customers sign in with a phone number and a PIN delivered over WhatsApp only. SMS and email PIN delivery and guest checkout are removed from the customer flow. The PIN is stored as a keyed hash with attempt and request limits, unverified accounts are purged after 24 hours, the customer session lasts 90 days, legacy accounts re-verify by WhatsApp, and a WhatsApp outage shows a notice and raises an Incident. Details, acceptance criteria and risks: `compliance/plans/REQ-117/implementation-plan.md`.

This ticket is a skeleton written at Stage 1; Stage 3 completes it (implementation details, verification, operator tasks).

## Sign-off (dual-actor)

To be completed at Stage 3.
