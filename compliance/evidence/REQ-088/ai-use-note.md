/\*\*

- @requirement REQ-088 — AI use note
-
- AI involvement: HIGH — Claude (Cascade) is authoring implementation code,
- tests, and compliance artefacts for this REQ.
-
- Risk class: HIGH (financial flows: inventory, points, rewards, payments)
- AI raises risk by one level per SDLC policy, but risk is already HIGH.
-
- Human oversight path:
- - Plan approval: operator reviews this implementation plan before coding begins
- - Code review: PR to develop requires human approval (HIGH risk → no self-merge)
- - UAT verification: operator verifies on UAT before PR to main
- - Release approval: second human reviewer must approve before merge to main
-
- AI prompts logged in: compliance/evidence/REQ-088/ai-prompts.md
-
- Provenance: sdlc-implementer@1.0 (operator-authorized)
  \*/
