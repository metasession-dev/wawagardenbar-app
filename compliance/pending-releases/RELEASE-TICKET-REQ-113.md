# Release Ticket: REQ-113 — Printable A4 menu ("Print New Menu")

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-10-23
**Requirement ID:** REQ-113
**Risk Level:** LOW
**Issue:** [#954](https://github.com/metasession-dev/wawagardenbar-app/issues/954)
**Implementation branch:** `feat/REQ-113-printable-a4-menu`

- **Absorbed predecessor releases:** REQ-114

## Summary

Staff with `menuManagement` get a **Print New Menu** button on `/dashboard/menu`, placed directly before "Edit All". It opens `/dashboard/menu/print`, where they choose:

- the main categories to include;
- the price type (default, happy-hour or show price; an unset price falls back to the default);
- the title, which follows the price type until edited;
- 1–3 columns, portrait or landscape;
- the Brand colours or Printer-friendly (black & white) template;
- optional footer text.

**Generate Menu** re-reads the available menu items through a read-only server action and draws an on-page preview. **Download PDF** saves an A4 PDF named `wawa-menu-<title-slug>-<YYYY-MM-DD>.pdf`. Each item shows name and price only. Prices print as `N4,500`, because jsPDF's built-in Helvetica can't render `₦`. Nothing is persisted, and the PR adds no new dependencies.

## AI contributors

| Tool        | Version | Commits                                                                     | Date       |
| ----------- | ------- | --------------------------------------------------------------------------- | ---------- |
| Claude Code | —       | plan, ADR, implementation, test and compliance commits on this REQ's branch | 2026-10-23 |

## Implementation details

- **`lib/menu-print/`** (new): pure modules with no DOM use, except `logo.ts`.
  - `types`, `format`: price formatting, title slug, filename.
  - `build-menu-print-model`: category selection and order, price per type with fallback, and an "Other" sub-section for items with no sub-category.
  - `themes`: colour roles mapped to the brand (`#1a4d2e` / `#c9a961`) and black & white templates.
  - `layout`: `computeMenuLayout`, which flows columns down then across, wraps long names, never splits an item, keeps sub-category headings with their first item, and adds a footer with "Page X of Y".
  - `render-pdf`: jsPDF drawing.
  - `logo`: downscales the logo to 600 px and derives a greyscale copy.
- **`app/actions/admin/menu-print-actions.ts`** (new): `getPrintableMenuDataAction`. It checks the session and `menuManagement` itself, validates the slugs with zod (1–50 strings matching `MAIN_CATEGORY_SLUG_RE`), and queries only available `menu-item`s in the selected categories, projected to 7 fields.
- **`app/dashboard/menu/print/page.tsx`** (new): sits under the existing `menuManagement` layout guard. It renders `components/features/admin/menu-print/menu-print-client.tsx` and `menu-print-preview.tsx`; the preview is SVG drawn from the same layout ops as the PDF.
- **`app/dashboard/menu/page.tsx`**: adds the Print New Menu button.
- **Design:** ADR-005, produced at the operator's request (`docs/ADR/ADR-005-menu-print-shared-layout-ops.md`).
- **SRS:** REQ-MENUMGT-011 is new. REQ-MENUMGT-009 and REQ-MENUMGT-005 are trace-only.
- **Risk register:** `@risk-deferred` (LOW).
- **Rebased onto `develop` after REQ-114 (zod 4):** the action now imports `z` from `@/lib/zod`. No other change was needed.

## Verification

- TypeScript: 0 errors.
- ESLint: 0 errors (1000 pre-existing warnings).
- Unit/integration: 1644 passed, 4 skipped (full suite, after the rebase), including the REQ-113 tests under `__tests__/lib/menu-print/` and `__tests__/actions/admin/menu-print-actions.test.ts`.
- E2E: `e2e/admin/menu-print.spec.ts` passed 10/10 after the rebase (13/13 together with REQ-114's zod spec). A full regression was compared with `develop`.
- Full detail: `compliance/evidence/REQ-113/test-execution-summary.md` and `compliance/evidence/REQ-113/security-summary.md`.
- Manual check before UAT sign-off (build guide Part 8): four PDFs covering both orientations, both templates and 1–3 columns, one of them printed on A4.

## Sign-off (dual-actor)

This is a solo-operator team, so the "reviewer ≠ submitter" check is read as actor type, not human identity. The AI tooling that did this implementation and the human operator who approves on the portal are distinct actors. The operator approved the Stage 1 plan on 2026-10-23, and reviews the PR and performs the portal UAT review before Production approval.

## Bundled Changes

- **Core tracked release:** `REQ-113`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-113.json`
- **Manifest hash:** `sha256:2960d76a28856529e4ff11dafa3aefa421870d39b4c4bccc5b01fa1edd93fd02`
- **Absorbed predecessor releases:** REQ-114
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** Explicit predecessor release tickets and non-release work are consolidated under approval envelope `REQ-113`.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes the core tracked release plus the explicit predecessor releases and non-release work listed below.
- **Security / risk impact:** No additional security/risk impact identified automatically; reviewer must confirm in the canonical release artifacts.
- **Reference:** commit range `origin/main..HEAD`

### Explicit Constituent Releases

- `REQ-114` (predecessor/superseded) — �� Upgrade zod 3 → 4 to clear GHSA-mrhx-c7xc-m3w5

### Absorbed Non-Release Work

- `ff2171b` chore: sync SDLC templates from DevAudit
- `208f3da` chore(deps): bump next to 16.4.2 and dompurify to 3.4.17 (audit gate)
- `4ee226e` chore: ignore playwright-report-shard-\* artifacts
- `055ddb4` docs(compliance): close out REQ-112 (+ REQ-111) — sync main + reconcile (RELEASED)
