---
req: REQ-113
generated_from: compliance/plans/REQ-113/implementation-plan.md
---

# Test plan — REQ-113

File paths and test lists follow the #954 build guide (Part 6). Paths are predicted at Stage 1 and reconciled against the real files at Phase 2 step 4b.

| AC   | Test type | File / method                                                                                                    | Covered? |
| ---- | --------- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| AC1  | E2E       | `e2e/admin/menu-print.spec.ts` — button placement (x before "Edit All"; href `/dashboard/menu/print`)            | Planned  |
| AC2  | E2E       | `e2e/admin/menu-print.spec.ts` — uncheck every `print-main-*` → `print-generate` disabled                        | Planned  |
| AC3  | E2E       | `e2e/admin/menu-print.spec.ts` — title defaulting (Happy hour → "Happy hour price")                              | Planned  |
| AC4  | E2E       | `e2e/admin/menu-print.spec.ts` — edited title "Friday Night" survives a price-type change                        | Planned  |
| AC5  | Unit      | `__tests__/lib/menu-print/build-menu-print-model.test.ts` — selection, ordering, price per type                  | Planned  |
| AC5  | E2E       | `e2e/admin/menu-print.spec.ts` — preview contents (seeded items A/C, `N800`, `N1,500`)                           | Planned  |
| AC6  | Unit      | `__tests__/lib/menu-print/build-menu-print-model.test.ts` — `undefined`/`null`/`NaN` fall back to `price`        | Planned  |
| AC6  | E2E       | `e2e/admin/menu-print.spec.ts` — item C (no `happyHourPrice`) shows `N1,500`                                     | Planned  |
| AC7  | Unit      | `__tests__/lib/menu-print/format.test.ts` — `menuPrintFilename`                                                  | Planned  |
| AC7  | Unit      | `__tests__/lib/menu-print/render-pdf.test.ts` — real jsPDF: page count, A4 width, non-empty output               | Planned  |
| AC7  | E2E       | `e2e/admin/menu-print.spec.ts` — download filename pattern; file starts with `%PDF`                              | Planned  |
| AC8  | E2E       | `e2e/admin/menu-print.spec.ts` — change settings, regenerate, repeat                                             | Planned  |
| AC9  | Unit      | `__tests__/actions/admin/menu-print-actions.test.ts` — `find` filter `{ kind, isAvailable: true, mainCategory }` | Planned  |
| AC9  | E2E       | `e2e/admin/menu-print.spec.ts` — unavailable item B absent                                                       | Planned  |
| AC10 | Unit      | `__tests__/actions/admin/menu-print-actions.test.ts` — no session / missing permission → error, no query         | Planned  |
| AC10 | E2E       | `e2e/admin/menu-print.spec.ts` — CSR → `/dashboard/forbidden`                                                    | Planned  |
| AC11 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — distinct price x = columns; main-heading rule spans full width       | Planned  |
| AC11 | E2E       | `e2e/admin/menu-print.spec.ts` — columns changed then regenerated (iterate test)                                 | Planned  |
| AC12 | E2E       | `e2e/admin/menu-print.spec.ts` — `print-out-of-date` shown after change, cleared on regenerate                   | Planned  |
| AC13 | Unit      | `__tests__/lib/menu-print/themes.test.ts` — brand heading `#1a4d2e`, rule `#c9a961`, colour logo                 | Planned  |
| AC14 | Unit      | `__tests__/lib/menu-print/themes.test.ts` — every `bw` colour has R = G = B; greyscale logo                      | Planned  |
| AC14 | E2E       | `e2e/admin/menu-print.spec.ts` — B&W → svg `data-template="bw"`                                                  | Planned  |
| AC15 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — `computeMenuLayout` takes no theme argument                          | Planned  |
| AC16 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — no split item; 120-char name wraps left of the price                 | Planned  |
| AC17 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — landscape 297 × 210                                                  | Planned  |
| AC17 | E2E       | `e2e/admin/menu-print.spec.ts` — first svg `viewBox` is `0 0 297 210`                                            | Planned  |
| AC18 | Unit      | `__tests__/lib/menu-print/build-menu-print-model.test.ts` — model items carry only name and price                | Planned  |
| AC18 | E2E       | `e2e/admin/menu-print.spec.ts` — preview contents test                                                           | Planned  |
| AC19 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — footer ops below content bottom; "Page X of Y" only when multi-page  | Planned  |
| AC20 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — blank footer → no footer text op, rule still drawn                   | Planned  |

**E2E:** delegated to the `e2e-test-engineer` skill in Phase 2, which owns the final spec content and the e2e scope decision.

**Manual (before UAT sign-off):** build guide Part 8 — four PDFs across both orientations and templates and 1–3 columns, one printed on A4.
