# AI Prompts — REQ-041

**Requirement:** REQ-041 — Harden `xlsx` dependency (close R-002)
**Date:** 2026-05-24
**Tool:** Claude Opus 4.7 via Claude Code (CLI)

Operating instruction (paraphrased):

> Create a GH issue for the xlsx hardening, then implement it.

Key AI actions, in order:

1. Inspected `xlsx` usage — found the export path (`lib/report-export.ts`, safe)
   and the reachable parse path (`app/actions/expenses/csv-import-actions.ts`
   `XLSX.read` on uploads); concluded a real upgrade was required (no waiver).
2. Filed issue #119 (REQ-041) with scope + MEDIUM risk classification + ACs.
3. Pinned `xlsx` to `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` via
   `npm install … --package-lock-only --legacy-peer-deps`; confirmed
   `npm audit --audit-level=high` → 0 high/critical, `xlsx` no longer flagged.
4. Cleared `accepted_dep_risks` in `sdlc-config.json`; ran `devaudit update v0.1.8`
   to regenerate `ci.yml` with a strict audit gate.
5. Authored this evidence set + release ticket; added the RTM row; moved
   risk-register R-002 to Closed.

No application logic was written or modified; the change is dependency + config +
compliance bookkeeping only.
