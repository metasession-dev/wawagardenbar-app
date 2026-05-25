# REQ-043 — GRANDFATHERED (pre-onboarding baseline)

**Status:** PRE-ONBOARDING BASELINE — see `compliance/RTM.md` row REQ-043 and `compliance/risk-register.md` R-001.

**Source PR:** [#114 — `fix(tabs): emphasise Revert items as the safe default in delete dialog`](https://github.com/metasession-dev/wawagardenbar-app/pull/114)
**Implementation commit:** `8d4c6ba`
**Release PR (develop→main):** [#116](https://github.com/metasession-dev/wawagardenbar-app/pull/116) — merge commit `bba04c8`, merged 2026-05-23
**Risk:** LOW (cosmetic UI — Tailwind class diffs + copy)

## Why this directory contains no test scope / test plan / implementation plan / security summary

This requirement was authored, implemented, merged, and deployed to production **before** the DevAudit SDLC framework was re-onboarded to the project (re-onboarding 2026-05-24; this REQ shipped to main 2026-05-23). At authoring time the assistant had a stale memory entry stating the SDLC had been retired permanently, so no compliance scaffolding was produced.

The full rationale and UAT context is preserved on the GitHub PR description (#114). No new tests were added — the change is purely visual (Tailwind class diffs + copy rewording in `delete-tab-dialog.tsx`), with no JS branching changes. Existing vitest cases for the dialog's parent (`TabService.deleteTab`) continued to pass.

## What was shipped

- `components/features/admin/tabs/delete-tab-dialog.tsx` — replaced the two radio options with bordered cards that get a coloured ring on selection (primary tone for **Revert items**, destructive tone for **Leave as-is**); added a **Recommended** pill on Revert; rewrote the option descriptions to plainer English clarifying when to pick each.

## Why this was needed

UAT testing on REQ-042 revealed that the two delete-dialog radio options had equal visual weight; a stray click silently flipped the choice to Leave-as-is and inventory wasn't restored as the operator intended. This change makes the selected option unmistakable.

## Compensating control going forward

REQ-046 onward will go through the full DevAudit gated flow.
