# Security Summary — REQ-041

**Requirement:** REQ-041 — Harden `xlsx` dependency (close R-002)
**Date:** 2026-05-24

## Advisory closed

`xlsx` (SheetJS) `^0.18.5` carried two **high** CVEs, both in the parsing path:

- **CVE-2023-30533** — prototype pollution (fixed in 0.19.3)
- **CVE-2024-22363** — ReDoS (fixed in 0.20.2)

These were **reachable** via the expense-import feature (`XLSX.read` on uploaded
spreadsheets in `app/actions/expenses/csv-import-actions.ts`), so a waiver was
not justified — an actual upgrade was required.

## Fix

`xlsx` pinned to the patched **SheetJS CDN build 0.20.3** (≥ both fix versions).
SheetJS no longer publishes to the npm registry, so the dependency references the
CDN tarball directly. API-compatible — no application changes.

## npm audit — before → after

| Severity | Before | After |
| --- | --- | --- |
| high | 1 (`xlsx`) | **0** |
| moderate | 7 | 7 (unchanged, transitive, below gate) |

`npm audit --audit-level=high` now exits 0.

## Gate posture

`xlsx` removed from `sdlc-config.json` `accepted_dep_risks` (now `""`); the
regenerated `ci.yml` dependency-audit job hard-fails on any unaccepted
high/critical. SAST (Semgrep) continues at baseline 0. Risk-register **R-002**
moved to Closed.
