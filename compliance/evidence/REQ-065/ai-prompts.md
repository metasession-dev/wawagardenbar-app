# REQ-065 — AI prompts (Phase 3 evidence)

Operator-issued prompts captured for the AI-assisted portion of this requirement. Full conversation transcript is retained out-of-band per the project's AI logging policy.

## Cycle-opening prompt (operator)

> "implement bundle B, C and D"

…followed by the operator's mid-cycle clarification after REQ-064's "no screenshots at UAT" lesson:

> "for bundle c I want you to use the test engineer create the new tests and run the regression pack as well"

…which established the **earlier-execution pattern** for REQ-065: author + run live during the evidence-pack phase rather than deferring to close-out as REQ-064 did.

## Phase 0 — scoping decisions the operator owned

1. **Bundle composition.** P4 #19 (data export) + P4 #20 (cookie banner) shipped together as REQ-065; P4 #21 (signup consent) had already shipped in REQ-063 at the PIN-flow surface.
2. **Cookie consent UX shape.** Informational mode (single "Got it" button) over strict GDPR consent UI — chosen at plan time because the app currently has no analytics scripts wired (confirmed by inspection).
3. **Earlier E2E execution.** Author + run live during the evidence-pack PR so screenshots are in hand at UAT-approval time, not after release as happened on REQ-064.
4. **Cookie banner unit test deletion.** When the project's vitest config was found to be node-only (no jsdom + no `.test.tsx` precedent), the operator's prior pattern (deferring UI to manual UAT) applied — the component test was removed in favour of live E2E coverage.

## Phase boundary prompts (operator)

> "is the full e2e regression pack completed"

(Confirmed REQ-064 had completed regression; REQ-065 had not yet started. Operator merged PR #274 immediately after, signalling proceed with the REQ-065 cycle on the earlier-execution pattern.)

> "#274 merged"

(Confirmed integration PR landed on develop. The agent then watched develop CI, verified green, branched chore/REQ-065-evidence-pack, invoked the `e2e-test-engineer` skill, and ran specs live against UAT.)

## AI-generated artefacts in this cycle

- `compliance/plans/REQ-065/implementation-plan.md`
- `compliance/evidence/REQ-065/{test-plan,test-scope,test-execution-summary,security-summary,ai-prompts,ai-use-note,implementation-plan}.md`
- `compliance/pending-releases/RELEASE-TICKET-REQ-065.md`
- `app/api/user/export/route.ts` + `lib/rate-limit.ts` + `components/features/profile/data-export-button.tsx` + `components/shared/cookie-consent-banner.tsx`
- Modified `app/(customer)/profile/page.tsx` + `app/layout.tsx`
- 9 new vitest cases + 3 new Playwright specs

The agent did not author commit messages or PR descriptions independently of the operator's tracked-work conventions; titles use the `[REQ-065]` bracket form per `feedback_pr_title_req_brackets`.
