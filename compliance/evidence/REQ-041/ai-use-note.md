# AI Use Note — REQ-041

**Requirement:** REQ-041 — Harden `xlsx` dependency (close R-002)
**Date:** 2026-05-24

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI)
- **What AI did:** identified the reachable `xlsx` parse-path CVEs, pinned `xlsx` to the patched SheetJS CDN build (`0.20.3`) and refreshed the lockfile, verified `npm audit --audit-level=high` exits 0, flipped the audit gate to strict (`accepted_dep_risks=""` + `devaudit update`), and authored the compliance artifacts (this evidence set, release ticket, RTM row, R-002 closure).
- **AI-generated changes:** `package.json` / `package-lock.json` (dependency pin — produced by npm), `sdlc-config.json` gate flip, regenerated `.github/workflows/ci.yml`, and all REQ-041 `compliance/` markdown.
- **No application source modified** — the `xlsx` public API is unchanged.
- **Human reviewer:** Stage 3 four-eyes approver (`dual_actor`), independent of the submitter.
- See `ai-prompts.md` for the operating prompts.
