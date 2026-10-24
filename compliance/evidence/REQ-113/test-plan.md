---
req: REQ-113
generated_from: compliance/plans/REQ-113/implementation-plan.md
---

# Test plan — REQ-113

File paths and test lists follow the #954 build guide (Part 6). Reconciled against the real files at Phase 2 step 4b (2026-10-23): every path exists. "Yes" = test written and passing locally (Vitest 58/58; Playwright `e2e/admin/menu-print.spec.ts` 9/9).

| AC   | Test type | File / method                                                                                                      | Covered? |
| ---- | --------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| AC1  | E2E       | `e2e/admin/menu-print.spec.ts` — button placement (x before "Edit All"; href `/dashboard/menu/print`)              | Yes      |
| AC2  | E2E       | `e2e/admin/menu-print.spec.ts` — uncheck every `print-main-*` → `print-generate` disabled                          | Yes      |
| AC3  | E2E       | `e2e/admin/menu-print.spec.ts` — title defaulting (Happy hour → "Happy hour price")                                | Yes      |
| AC4  | E2E       | `e2e/admin/menu-print.spec.ts` — edited title "Friday Night" survives a price-type change                          | Yes      |
| AC5  | Unit      | `__tests__/lib/menu-print/build-menu-print-model.test.ts` — selection, ordering, price per type                    | Yes      |
| AC5  | E2E       | `e2e/admin/menu-print.spec.ts` — preview contents (seeded items A/C, `N800`, `N1,500`)                             | Yes      |
| AC6  | Unit      | `__tests__/lib/menu-print/build-menu-print-model.test.ts` — `undefined`/`null`/`NaN` fall back to `price`          | Yes      |
| AC6  | E2E       | `e2e/admin/menu-print.spec.ts` — item C (no `happyHourPrice`) shows `N1,500`                                       | Yes      |
| AC7  | Unit      | `__tests__/lib/menu-print/format.test.ts` — `menuPrintFilename`                                                    | Yes      |
| AC7  | Unit      | `__tests__/lib/menu-print/render-pdf.test.ts` — real jsPDF: page count, A4 width, non-empty output                 | Yes      |
| AC7  | E2E       | `e2e/admin/menu-print.spec.ts` — download filename pattern; file starts with `%PDF`                                | Yes      |
| AC8  | E2E       | `e2e/admin/menu-print.spec.ts` — change settings, regenerate, repeat                                               | Yes      |
| AC9  | Unit      | `__tests__/actions/admin/menu-print-actions.test.ts` — `find` filter `{ kind, isAvailable: true, mainCategory }`   | Yes      |
| AC9  | E2E       | `e2e/admin/menu-print.spec.ts` — unavailable item B absent                                                         | Yes      |
| AC10 | Unit      | `__tests__/actions/admin/menu-print-actions.test.ts` — no session / missing permission → error, no query           | Yes      |
| AC10 | E2E       | `e2e/admin/menu-print.spec.ts` — CSR → `/dashboard/forbidden`                                                      | Yes      |
| AC11 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — distinct price x = columns; main-heading rule spans full width         | Yes      |
| AC11 | E2E       | `e2e/admin/menu-print.spec.ts` — columns changed then regenerated (iterate test)                                   | Yes      |
| AC12 | E2E       | `e2e/admin/menu-print.spec.ts` — `print-out-of-date` shown after change, cleared on regenerate                     | Yes      |
| AC13 | Unit      | `__tests__/lib/menu-print/themes.test.ts` — brand heading `#1a4d2e`, rule `#c9a961`, colour logo                   | Yes      |
| AC13 | Unit      | `__tests__/lib/menu-print/render-pdf.test.ts` — brand green fill and gold stroke operators present in the real PDF | Yes      |
| AC14 | Unit      | `__tests__/lib/menu-print/themes.test.ts` — every `bw` colour has R = G = B; greyscale logo                        | Yes      |
| AC14 | E2E       | `e2e/admin/menu-print.spec.ts` — B&W → svg `data-template="bw"`                                                    | Yes      |
| AC15 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — `computeMenuLayout` takes no theme argument                            | Yes      |
| AC16 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — no split item; 120-char name wraps left of the price                   | Yes      |
| AC17 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — landscape 297 × 210                                                    | Yes      |
| AC17 | E2E       | `e2e/admin/menu-print.spec.ts` — first svg `viewBox` is `0 0 297 210`                                              | Yes      |
| AC18 | Unit      | `__tests__/lib/menu-print/build-menu-print-model.test.ts` — model items carry only name and price                  | Yes      |
| AC18 | E2E       | `e2e/admin/menu-print.spec.ts` — preview contents test                                                             | Yes      |
| AC19 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — footer ops below content bottom; "Page X of Y" only when multi-page    | Yes      |
| AC20 | Unit      | `__tests__/lib/menu-print/layout.test.ts` — blank footer → no footer text op, rule still drawn                     | Yes      |

**E2E:** authored by the `e2e-test-engineer` skill in Phase 2 (regression tier — REQ-MENUMGT-011 is a Should). Every UI-facing AC (1–12, 14, 17, 18) has a `tagTest` and an `evidenceShot`; AC13, AC15, AC16, AC19 and AC20 are layout/theme properties with no separate UI surface and are proved by the Vitest layout, themes and render-pdf tests.

**Manual (before UAT sign-off):** build guide Part 8 — four PDFs across both orientations and templates and 1–3 columns, one printed on A4.
