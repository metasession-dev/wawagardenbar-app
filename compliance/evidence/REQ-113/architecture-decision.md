---
req: REQ-113
generated_by: adr-author
generated_at: 2026-10-23T23:30:00Z
---

# Architecture decision — REQ-113

## Outcome

**Produced ADR-005:** Printable menu: one pure layout engine drawn by both the SVG preview and a client-side jsPDF renderer (`docs/ADR/ADR-005-menu-print-shared-layout-ops.md`).

## Detail

- **ADR file:** `docs/ADR/ADR-005-menu-print-shared-layout-ops.md`
- **Status:** Proposed. It was drafted at the operator's request on 2026-10-23, and the operator flips it to _Accepted_ at sign-off.
- **Summary:** `computeMenuLayout` in `lib/menu-print/layout.ts` computes the layout once, as pure millimetre draw operations measured with jsPDF's own Helvetica metrics. Both the SVG preview (`menu-print-preview.tsx`) and the PDF (`render-pdf.ts`) draw those same operations, so the two can't disagree. Draw ops reference colours by role, which the theme resolves at draw time. jsPDF is loaded client-side with `await import('jspdf')`, and `jspdf-autotable` is not used.
- **Verdict history:** `adr-author`'s Stage 1 heuristic said "no ADR needed". No signal matched: no new dependency, external service, data tier or schema change; no existing code path changes pattern; risk is LOW. The operator overrode this at plan approval to record the shared draw-ops design (review finding R8), the choice of client-side jsPDF, and the WinAnsi font constraints (`N4,500`, ASCII `...`).
- **Implementation matches the ADR:**
  - the layout engine takes no theme argument (proved by the AC15 test in `__tests__/lib/menu-print/layout.test.ts`);
  - `menu-print-client.tsx` loads `jspdf` with a dynamic import in both handlers (lines 206 and 227);
  - `render-pdf.test.ts` checks the PDF's colour operators against both themes.
- **Affected files:** `lib/menu-print/*`, `components/features/admin/menu-print/*`, `app/dashboard/menu/print/page.tsx`
- **ID check:** ADR-005 is the next free ID on `origin/develop`, which holds ADR-001 to ADR-004. REQ-114 (zod 4, merging first) adds no ADR, so the ID can't collide.
- **Cross-references:**
  - SRS: REQ-MENUMGT-011 (new) and REQ-MENUMGT-009 (trace-only). See `srs-alignment.md`.
  - Risk register: none, because the REQ is LOW risk. See `risk-assessment.md`.

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [ ] If ADR: the file at `docs/ADR/ADR-005-menu-print-shared-layout-ops.md` is edited from stub to canonical prose and status is Accepted.
- [ ] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree. _(N/A — ADR produced.)_

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
