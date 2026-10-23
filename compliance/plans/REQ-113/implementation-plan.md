---
title: 'Implementation plan — REQ-113'
requirement_id: 'REQ-113'
risk_class: 'LOW'
change_type: 'feat'
authored_by: 'sdlc-implementer (AI-assisted)'
authored_at: '2026-10-23'
---

# Implementation plan — REQ-113

## Framework attribution

**Evidence type:** `compliance_document` · **Category:** `planning` · **Scope:** per-REQ

**Closes clauses** (every implementation plan satisfies all four):

| Clause                                                    | What this plan must contain                                |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| **ISO 29119 §3.4** Test Plan                              | Acceptance criteria + the strategy for verifying each one. |
| **ISO 27001 A.8.25** Secure development life cycle        | Threat model + secure-design considerations.               |
| **GDPR Art. 25** Data protection by design and by default | Explicit "no personal data" callout (not applicable).      |
| **EU AI Act Art. 11** Technical documentation (Annex IV)  | Explicit "no AI in scope" callout (not applicable).        |

**Source of truth:** issue [#954](https://github.com/metasession-dev/wawagardenbar-app/issues/954) and its comment _"Review of #954 and implementation plan"_ ([#issuecomment-6369516965](https://github.com/metasession-dev/wawagardenbar-app/issues/954#issuecomment-6369516965)), which is the authoritative build guide (module signatures, layout constants, algorithm, test list). This plan records the SDLC decisions and traceability; it does not restate the module specifications. Where the two differ, the issue comment wins and the difference is recorded here under _Plan deviation_.

## 1. Goal + acceptance criteria

- **Goal:** Let staff with menu-management permission generate a branded, printable A4 menu from live menu data (chosen main categories and price type, 1–3 columns, portrait or landscape, brand or black-and-white template, editable title and footer), preview it on screen, and download it as a PDF that matches the preview.

- **Acceptance criteria** (from #954; AC11 as corrected by review finding R2):

| AC   | Description                                                                                                                                                                                                          | SRS item it traces to |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| AC1  | Given an admin with `menuManagement` on `/dashboard/menu`, When the page loads, Then "Print New Menu" is visible directly before "Edit All" and links to `/dashboard/menu/print`.                                    | REQ-MENUMGT-011 (new) |
| AC2  | Given the print page, When no main category is selected, Then "Generate Menu" is disabled.                                                                                                                           | REQ-MENUMGT-011 (new) |
| AC3  | Given price type "Happy hour price", When the title has not been edited, Then the title reads "Happy hour price".                                                                                                    | REQ-MENUMGT-011 (new) |
| AC4  | Given the admin edited the title to "Friday Night", When they switch price type, Then the title remains "Friday Night".                                                                                              | REQ-MENUMGT-011 (new) |
| AC5  | Given categories and a price type are selected, When "Generate Menu" is clicked, Then the preview shows the logo, the title and only the selected categories' available items, priced per the chosen type.           | REQ-MENUMGT-011 (new) |
| AC6  | Given an item with no `happyHourPrice`, When "Happy hour price" is chosen, Then the item's default price is shown.                                                                                                   | REQ-MENUMGT-011 (new) |
| AC7  | Given a generated preview, When "Download PDF" is clicked, Then an A4 PDF named `wawa-menu-<title-slug>-<YYYY-MM-DD>.pdf` is downloaded with the same title, items and prices.                                       | REQ-MENUMGT-011 (new) |
| AC8  | Given a generated menu, When the admin changes settings and clicks "Generate Menu" again, Then the preview and the next PDF reflect the new settings (repeatable).                                                   | REQ-MENUMGT-011 (new) |
| AC9  | Given an unavailable item in a selected category, When the menu is generated, Then the item is absent from the preview and the PDF.                                                                                  | REQ-MENUMGT-011 (new) |
| AC10 | Given a user without `menuManagement`, When they visit `/dashboard/menu/print`, Then access is denied (redirect to `/dashboard/forbidden`), and the data action refuses the request.                                 | REQ-MENUMGT-011 (new) |
| AC11 | Given columns set to 1, 2 or 3, When generated, Then the preview and PDF use that many columns, with main-category headings spanning the full width and sub-category headings inside a column with their first item. | REQ-MENUMGT-011 (new) |
| AC12 | Given a generated menu, When the column count changes, Then the preview is marked "out of date" until regenerated, and "Download PDF" still produces the last generated layout.                                      | REQ-MENUMGT-011 (new) |
| AC13 | Given the "Brand colours" template, When the PDF is downloaded, Then it uses `#1a4d2e` and `#c9a961` and the colour logo.                                                                                            | REQ-MENUMGT-011 (new) |
| AC14 | Given the "Printer-friendly (black & white)" template, When the PDF is downloaded, Then it contains only black, grey and white and a greyscale logo.                                                                 | REQ-MENUMGT-011 (new) |
| AC15 | Given the same inputs, When only the template changes, Then item content and ordering are identical.                                                                                                                 | REQ-MENUMGT-011 (new) |
| AC16 | Given 3 columns and a long item name, When generated, Then the name wraps within its column without overlapping the price or the next column, and no item is split across columns or pages.                          | REQ-MENUMGT-011 (new) |
| AC17 | Given "Landscape", When generated, Then the preview and PDF are A4 landscape with columns fitted to the wider page.                                                                                                  | REQ-MENUMGT-011 (new) |
| AC18 | Given a generated menu, When the admin views it, Then each item shows only its name and price (no description).                                                                                                      | REQ-MENUMGT-011 (new) |
| AC19 | Given footer text is set, When generated, Then it appears on every page, with "Page X of Y" on multi-page menus, and never overlaps content.                                                                         | REQ-MENUMGT-011 (new) |
| AC20 | Given footer text is blank, When generated, Then no footer text is printed (the footer rule remains).                                                                                                                | REQ-MENUMGT-011 (new) |

> SRS-ID column populated by the `requirements-aligner` skill (Stage 1, 2026-10-23).

### SRS items proposed/touched

| AC       | SRS item                         | Status                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------- | -------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1–AC20 | REQ-MENUMGT-011 (new — proposed) | added (approved)       | Print New Menu. Added to `docs/SRS.md` (summary table + Given/When/Then block). **ID differs from #954's proposed `REQ-MENU-009`:** the `REQ-MENU-*` area is the customer-facing menu and cart (Feature Area: Menu), while admin menu tooling, including Edit All (REQ-MENUMGT-009) and Pricing Windows (REQ-MENUMGT-010), lives under Feature Area 13 — Menu Management. Operator approved the ID and wording on 2026-10-23; `@srs-stub` marker removed. |
| AC6      | REQ-MENUMGT-009 (existing)       | unchanged (trace-only) | Price fallback mirrors Edit All's unset-value fallback; Edit All itself is not changed.                                                                                                                                                                                                                                                                                                                                                                   |
| AC2, AC5 | REQ-MENUMGT-005 (existing)       | unchanged (trace-only) | Reads the configurable main-category registry (enabled flag, order); the registry is not changed.                                                                                                                                                                                                                                                                                                                                                         |

**SRS drift found (advisory, not this REQ's scope):** `REQ-ORDMGT-011`, `REQ-ORDMGT-012`, `REQ-ORDMGT-015` and `REQ-ORDMGT-016` have heading blocks in `docs/SRS.md` but no row in the summary table. Worth a separate `docs:` fix so future ID allocation can't collide.

**Stage 1 gate:** advisory (`requirements_aligner.block_on_stage_1` defaults to `false`). Every AC traces to an SRS item; REQ-MENUMGT-011 wording approved by the operator on 2026-10-23.

## 2. Scope

- **In scope** (per build guide Part 3):
  - New pure modules `lib/menu-print/{types,format,build-menu-print-model,themes,layout,render-pdf}.ts`, and browser-only `lib/menu-print/logo.ts`.
  - New read-only server action `app/actions/admin/menu-print-actions.ts` (`getPrintableMenuDataAction`).
  - New route `app/dashboard/menu/print/page.tsx` (server component) with client components `components/features/admin/menu-print/menu-print-client.tsx` and `menu-print-preview.tsx` (SVG preview drawn from the same layout ops as the PDF).
  - Edit `app/dashboard/menu/page.tsx`: "Print New Menu" button before "Edit All".
  - Unit tests under `__tests__/lib/menu-print/` and `__tests__/actions/admin/menu-print-actions.test.ts`; E2E spec `e2e/admin/menu-print.spec.ts` (via `e2e-test-engineer`).
  - `docs/SRS.md` entry REQ-MENUMGT-011; `compliance/RTM.md` row REQ-113.
- **Out of scope:**
  - `lib/report-export.ts` is not modified. Review finding R10 (its `formatCurrency` likely renders `₦` as garbage inside jsPDF) is to be checked and filed as a separate issue.
  - Saved presets, multi-language menus, item descriptions, a toggle to include unavailable items, and venue address/phone in the default footer (open question in #954; the footer text is editable, so staff can add it themselves).
  - No new npm dependencies (NFR-5); `jspdf-autotable` is not used for this feature.

### Surface inventory

| Surface                    | URL / file                                                              | Status                                                                                      |
| -------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Menu admin toolbar         | `/dashboard/menu` — `app/dashboard/menu/page.tsx`                       | In scope (new "Print New Menu" button)                                                      |
| Print New Menu page        | `/dashboard/menu/print` — `app/dashboard/menu/print/page.tsx` + client  | In scope (new)                                                                              |
| Downloaded PDF             | Browser download, built client-side by `lib/menu-print/render-pdf.ts`   | In scope (new)                                                                              |
| Access control             | `app/dashboard/menu/layout.tsx` → `requirePermission('menuManagement')` | Already works — the new static segment `print` sits under the existing layout guard         |
| Main/sub-category registry | `SystemSettingsService.getMainCategories()` / `getMenuCategories()`     | Already works — read only                                                                   |
| Menu item data             | `models/menu-item-model.ts`                                             | Already works — read only (`kind`, `isAvailable`, `mainCategory`, `category`, price fields) |
| Edit All price fallback    | `app/dashboard/menu/edit-all/page.tsx`                                  | Already works — mirrored (not changed) by `resolvePrintPrice`                               |

## 3. Architecture decisions

> _Populated by the `adr-author` skill at Stage 1._

- **ADR-005 — Printable menu: one pure layout engine drawn by both the SVG preview and a client-side jsPDF renderer** — Drafted by `adr-author` at the operator's request. File at `docs/ADR/ADR-005-menu-print-shared-layout-ops.md`. Status _Proposed_; the operator flips it to _Accepted_.
  - _History:_ `adr-author`'s Stage 1 verdict was "No ADR needed" (self-contained additive module; no new dependency, external service, data tier or schema; no existing code path changes pattern; risk LOW). On 2026-10-23 the operator asked for the ADR to be included anyway, to record the shared draw-ops design (review finding R8), client-side jsPDF without `jspdf-autotable`, and the WinAnsi font constraints (`N4,500`, ASCII `...`).

## 4. E2E test coverage

- **Spec(s):** `e2e/admin/menu-print.spec.ts` — to be authored by the `e2e-test-engineer` skill in Phase 2 (this skill does not author e2e specs).
- **ACs covered (planned, per build guide Part 6):** AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11 (columns via out-of-date flow), AC12, AC14 (`data-template`), AC17, AC18. AC13, AC15, AC16, AC19 and AC20 are layout/theme properties proved by unit tests (§9).

## 5. Threat model + security considerations

| Threat                                                                    | Likelihood | Impact | Mitigation                                                                                                                                                                                                       |
| ------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthorised user opens the print page                                    | Low        | Low    | Route sits under `app/dashboard/menu/layout.tsx` (`requirePermission('menuManagement')`); E2E asserts CSR is redirected to `/dashboard/forbidden` (AC10).                                                        |
| Server action called directly (bypassing the page) to read menu data      | Low        | Low    | Action re-checks the iron-session and `hasSessionPermission(session, 'menuManagement')` itself; unit tests cover no-session and missing-permission (AC10). Data is non-sensitive menu prices.                    |
| Malformed or hostile `mainCategorySlugs` input (NoSQL operator injection) | Low        | Low    | zod: array of 1–50 strings matching `MAIN_CATEGORY_SLUG_RE`; used only inside `{ $in: slugs }`. Invalid input returns a validation error before any query.                                                       |
| Unbounded query / heavy PDF                                               | Low        | Low    | Query filtered to selected categories, `kind: 'menu-item'`, `isAvailable: true`, projected to 7 fields; logo downscaled to 600 px (NFR-2). Generation runs in the requesting admin's browser, not on the server. |
| Stored XSS via item names in the preview                                  | Low        | Low    | Names render as React text children of SVG `<text>` (escaped by React); no `dangerouslySetInnerHTML`.                                                                                                            |

**Secrets / credentials:** None introduced. Uses the existing session cookie only.

**Dependencies introduced:** None (NFR-5). Uses existing `jspdf` ^4.2.1, `date-fns`, `zod`, `lucide-react` and `components/ui/*`. `jspdf` is loaded with `await import('jspdf')` inside handlers, keeping it out of SSR and the initial bundle.

### Risk register entries

`@risk-deferred: LOW risk — admin-only, read-only feature with no personal data, payments, new dependency or new public endpoint; the threats above are covered by existing controls plus the action's own permission check, so nothing is register-worthy.`

## 6. Data protection (GDPR Art. 25)

N/A — this REQ does not process personal data. It reads menu items (names, categories, prices) and category settings only; no customer or staff data is read, stored or exported, and nothing is persisted (FR-5).

## 7. AI / model considerations (EU AI Act Art. 11)

N/A — this REQ does not introduce or change AI behaviour. PDF layout is deterministic code.

## 8. Rollback plan

- **Reversible via:** `git revert` of the REQ-113 commits. The feature is additive (new route, new modules, one toolbar button).
- **Data implications of rollback:** None — the feature writes no data.
- **Notification path if rollback during a release:** Operator notifies menu-management staff that "Print New Menu" is temporarily unavailable; existing menu editing is unaffected.

## 9. Verification

- **Unit tests (Vitest, node environment)** — per build guide Part 6:
  - `__tests__/lib/menu-print/format.test.ts` — `N4,500` price format (review R3: no `₦`), title defaulting/trimming, slug and filename.
  - `__tests__/lib/menu-print/build-menu-print-model.test.ts` — selection, ordering, price-type resolution and fallback (AC5, AC6, AC18), "Other" sub-section, empty handling.
  - `__tests__/lib/menu-print/themes.test.ts` — brand colours (AC13), B&W colours are pure greys (AC14).
  - `__tests__/lib/menu-print/layout.test.ts` — columns (AC11), landscape (AC17), no split items and wrapping (AC16), heading kept with first item, footer and page numbers (AC19, AC20), theme-free layout signature (AC15), empty model.
  - `__tests__/lib/menu-print/render-pdf.test.ts` — real jsPDF under Node (verified at Stage 1: jsPDF ^4.2.1 loads under Node, A4 landscape width 297 mm, `getTextWidth`/`splitTextToSize` work).
  - `__tests__/actions/admin/menu-print-actions.test.ts` — auth (AC10), validation, query filter (AC9), serialisation.
- **E2E coverage:** see §4.
- **Manual smoke before UAT sign-off** (build guide Part 8): four PDFs (portrait/landscape × brand/B&W across 1–3 columns), one printed on A4; check logo, pagination, footer, prices against Edit All, preview matching the PDF page for page.
- **Monitoring / alerting:** None added; the action logs failures with `console.error` like existing admin actions.

## 10. Sign-off

- **Plan reviewer (eng):** William (operator) — 2026-10-23
- **Plan reviewer (security / DPO):** N/A — LOW risk, no personal data.
- **Plan approved by operator:** William — 2026-10-23. Approved in the Claude Code session: SRS ID REQ-MENUMGT-011 (instead of #954's proposed REQ-MENU-009) approved; REQ-MENUMGT-011 wording accepted as written (`@srs-stub` marker removed); venue address/phone stays out of the default footer (#954 open question closed as out of scope).

## Upload path

This file lives at `compliance/plans/REQ-113/implementation-plan.md`. At Phase 3 the `sdlc-implementer` skill copies it to `compliance/evidence/REQ-113/implementation-plan.md`, and the next push to `develop` uploads it via `compliance-evidence.yml`.
