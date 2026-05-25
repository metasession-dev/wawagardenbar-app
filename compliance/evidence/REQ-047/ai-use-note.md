# AI Use Note — REQ-047

**Requirement:** REQ-047 — Harden CORS origin reflection (`lib/cors.ts`)
**Date:** 2026-05-25

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI)
- **What AI did:** diagnosed the `cors-misconfiguration` finding exposed when the SAST gate was restored (DevAudit-Installer #48), implemented the `lib/cors.ts` hardening (exact allow-list match, drop `'*'`, echo configured literal), wrote the unit test, and authored the compliance artifacts (evidence set, RTM row, release ticket, this note).
- **AI-generated changes:** `lib/cors.ts` (reflection logic), `__tests__/security/cors-origin-reflection.test.ts`, all REQ-047 `compliance/` markdown.
- **No data/schema impact** — single pure-function refactor.
- **Human reviewer:** Stage 3 four-eyes approver (`dual_actor`), independent of the submitter.
- See `ai-prompts.md` for the operating prompts.
