# Test Scope — REQ-041

**Requirement:** REQ-041 — Harden `xlsx` dependency (close R-002)
**Risk Level:** MEDIUM
**GitHub Issue:** [#119](https://github.com/metasession-dev/wawagardenbar-app/issues/119)
**Date:** 2026-05-24

## What changed

Dependency-only change — no application logic modified. `xlsx` (SheetJS) is
re-pointed from the vulnerable npm-registry `^0.18.5` to the **patched SheetJS
CDN build `0.20.3`** (`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`),
fixing CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS). The
`xlsx` public API (`XLSX.read`, `XLSX.utils.*`, `XLSX.writeFile`) is unchanged
between these versions.

## In scope (regression)

The two code paths that use `xlsx`:

- **Export / write** — `lib/report-export.ts` (`book_new`, `aoa_to_sheet`,
  `writeFile`): report spreadsheet generation must still produce a valid file.
- **Import / read (the security-relevant path)** — `app/actions/expenses/csv-import-actions.ts`
  (`XLSX.read` on uploaded files): expense import must still parse a valid
  spreadsheet, on the patched parser.

Plus the gates: `npm run build` (catches any API breakage) and the
dependency-audit gate (the objective — 0 high/critical).

## Out of scope

- Application behaviour / new features (none).
- The 7 residual **moderate** advisories (pre-existing transitive deps) — below
  the `--audit-level=high` gate, untouched.
- Replacing `xlsx` with another library (considered; the in-place CDN upgrade is
  the minimal fix that closes the CVEs).
