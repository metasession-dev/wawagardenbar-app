---
adr_id: 'ADR-005'
status: 'Proposed'
date: '2026-10-23'
authored_by: 'sdlc-implementer (AI-assisted)'
related_reqs: ['REQ-113']
supersedes: []
superseded_by: null
---

# ADR-005: Printable menu — one pure layout engine drawn by both the SVG preview and a client-side jsPDF renderer

## Status

**Proposed** (operator requested this ADR at plan approval on 2026-10-23, overriding the `adr-author` "no ADR needed" verdict; operator to flip to _Accepted_)

## Context

REQ-113 (#954, SRS REQ-MENUMGT-011) adds a "Print New Menu" page where staff generate a branded A4 menu with 1–3 columns, portrait or landscape, a brand or black-and-white template, and an editable title and footer, then download it as a PDF. Two requirements constrain the design: the on-screen preview must be a faithful scale of the PDF (FR-10, review finding R8), and the PDF must paginate cleanly (no item split across columns or pages, sub-category headings kept with their first item, footer never overlapping content). The project already generates PDFs in `lib/report-export.ts` with `jsPDF` + `jspdf-autotable`, but autotable lays out tables, not multi-column flowing text, and an HTML/CSS preview laid out by the browser would compute line wrapping and column breaks independently of jsPDF, so the two would drift. NFR-5 forbids new dependencies, and the feature is read-only and admin-only (risk LOW).

## Decision

Layout is computed once by a pure function, `computeMenuLayout(model, options, measurer, hasLogo)` in `lib/menu-print/layout.ts`, which returns pages of positioned draw operations (`text`, `rule`, `leader`, `logo`) in millimetres, with text `y` as baselines. Text is measured through an injected `TextMeasurer`; in the browser it is backed by jsPDF's own Helvetica metrics (`createJsPdfMeasurer`), so the engine wraps and breaks exactly as the PDF will render. Both outputs draw the same operations: `components/features/admin/menu-print/menu-print-preview.tsx` maps them to SVG elements (one `<svg viewBox="0 0 W H">` per page), and `lib/menu-print/render-pdf.ts` maps them to jsPDF calls in a document created with `unit: 'mm'`. Draw operations reference colours by role (`title`, `heading`, `text`, `muted`, `rule`, `leader`), never by hex; the two templates in `lib/menu-print/themes.ts` map roles to colours at draw time, and `computeMenuLayout` takes no theme argument, so a template change cannot alter content, order or pagination. The PDF is generated client-side with the existing `jspdf` package, loaded with `await import('jspdf')` inside the click handlers; `jspdf-autotable` is not used. Because jsPDF's built-in Helvetica is WinAnsi-encoded, prices print as `N4,500` (not `₦`) and clipped titles end in ASCII `...` (not `…`, which jsPDF silently drops).

## Consequences

- **Good:** The preview and the PDF cannot disagree on columns, wrapping, pagination or footer placement, because both draw one list of operations computed with one set of font metrics.
- **Good:** All layout logic is pure TypeScript with no DOM use, so the hard properties (no split items, heading kept with its first item, footer below the content area, column count, landscape size, theme-independence) are unit-tested in Vitest's node environment with a fake measurer, and `render-pdf` is tested against the real jsPDF class under Node.
- **Good:** No new dependency, no server-side PDF generation (no headless browser, no extra server load), and jsPDF stays out of SSR and the initial bundle.
- **Bad:** The engine hand-rolls layout that a document library would provide (column flow, wrapping, pagination). Changes to typography or spacing mean editing the exported layout constants and re-checking the layout tests, rather than adjusting CSS.
- **Bad:** Being limited to jsPDF's built-in WinAnsi fonts means no `₦`, `…` or other non-Latin-1 glyphs in the printed menu, and item names containing such characters will lose them in the PDF. Embedding a Unicode TTF would lift this but adds a font asset and PDF size (out of scope for REQ-113).
- **Neutral / tradeoffs:** The SVG preview approximates Helvetica with the browser's `Helvetica, Arial, sans-serif` stack, so glyph shapes can differ slightly on screen, but positions, line breaks and pagination come from jsPDF metrics and match the PDF exactly.

## Alternatives considered

- **HTML/CSS preview + `jspdf-autotable` (the existing `lib/report-export.ts` pattern):** ruled out because autotable cannot flow items down then across multiple columns, and a CSS-laid-out preview would wrap and paginate independently of the PDF, breaking the "faithful scale" requirement.
- **Server-side PDF from rendered HTML (headless Chromium, e.g. Playwright/Puppeteer):** ruled out by NFR-5 (no new dependencies), the extra server CPU and memory per generation, and the deployment footprint of a browser binary on the app server.
- **Rasterise the preview (html2canvas or `canvas.toDataURL`) into the PDF:** ruled out because the menu text would not be selectable or searchable, the file would be larger, and print sharpness would depend on the capture resolution.
- **Embed a Unicode TTF in jsPDF to print `₦`:** deferred rather than rejected; it adds a font asset and roughly a few hundred KB per PDF, and the ASCII `N4,500` form is common locally. Switching later is a change to `formatMenuPrice` plus font registration in `render-pdf.ts`.

## Cross-references

- Implementation plan: `compliance/plans/REQ-113/implementation-plan.md` (§3)
- Issue and authoritative build guide: #954 and its comment "Review of #954 and implementation plan" (findings R3, R4, R8, R9; Part 4.5 layout algorithm)
- SRS items: REQ-MENUMGT-011 (new), REQ-MENUMGT-009 (price fallback mirrored)
- Risk register: none — `@risk-deferred` (LOW)
- Related: `lib/report-export.ts` (existing PDF pattern, unchanged); review finding R10 (its `₦` likely renders garbled in jsPDF) is tracked separately
- Supersedes / superseded-by: none
