# Security Evidence Summary — REQ-113

**Date:** 2026-10-23

| Control                                     | Result | Evidence                                                                                                                                                                                                                                                  |
| ------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                            | PASS   | `scripts/evaluate-npm-audit.sh --audit <npm audit --json>` on the rebased branch: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` are unchanged from `develop`.                                                                        |
| SAST                                        | PASS   | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors (1000 pre-existing warnings). CI Quality Gates also runs semgrep.                                                                                                                                  |
| Access control (page)                       | PASS   | `/dashboard/menu/print` sits under `app/dashboard/menu/layout.tsx` (`requirePermission('menuManagement')`). E2E AC10 (`e2e/admin/menu-print.spec.ts`) checks that a CSR session is redirected to `/dashboard/forbidden`.                                  |
| Access control (server action)              | PASS   | `getPrintableMenuDataAction` checks the iron-session and `hasSessionPermission(session, 'menuManagement')` itself. Unit tests cover no session, an admin without the permission, and a CSR; none of them reaches the database query.                      |
| Input validation                            | PASS   | zod schema: an array of 1–50 strings matching `MAIN_CATEGORY_SLUG_RE`, used only inside `{ $in: slugs }`. Unit tests reject `[]`, a bad pattern, `$where`, an operator object (`{ $ne: null }`) and 51 slugs, all before any query.                       |
| Output encoding                             | PASS   | Item names render as React text children of SVG `<text>`. There is no `dangerouslySetInnerHTML`, `innerHTML` or `eval` in `lib/menu-print/`, `components/features/admin/menu-print/`, the print page or the action. PDF text goes through jsPDF `text()`. |
| New dependencies / secrets / external calls | PASS   | None. Uses the existing `jspdf`, loaded client-side with `await import('jspdf')`. No secrets, credentials or new network calls. The logo is loaded from the app's own `/logo.png`.                                                                        |

## Data handling

No personal data is processed. The action reads menu item names, categories and prices, plus the category settings. Nothing is stored or logged, and the PDF is generated in the admin's browser (implementation plan §6).

## Post-deploy controls

- No migration and no schema change.
- Reversible via `git revert` of the REQ-113 merge. The feature is additive: a new route, new modules and one toolbar button.

## Bundled Release Context

- **Core tracked release:** `REQ-113`
- **Absorbed predecessor releases:** `REQ-114`, the zod 3 → 4 upgrade (#956, PR #958). It merged to `develop` first and has not yet been released to `main`.
- **Absorbed non-release work:** the housekeeping commits REQ-114 already carried since `origin/main`: `ff2171b` (#955), `208f3da` (#952), `4ee226e` (#951) and `055ddb4` (#950). See `compliance/pending-releases/BUNDLED-CHANGES-REQ-113.md`.
- **Why bundled here:** REQ-113 is rebased onto REQ-114 and its code depends on it, because `menu-print-actions.ts` imports `z` from `@/lib/zod`. REQ-114's commits are in `origin/main..HEAD`, so they ship under this release.
- **Evidence impact:** Evidence ownership stays with each source. REQ-114's evidence is in `compliance/evidence/REQ-114/`, and nothing in it is relabelled as REQ-113's. The tests above cover REQ-113 and were run on top of REQ-114.
- **Reviewer impact:** UAT and Production approval covers REQ-113, plus REQ-114 and the four housekeeping commits.
- **Security / risk impact:** REQ-114 is itself a security fix (GHSA-mrhx-c7xc-m3w5), with risks R-038 and R-039 reviewed in PR #958. Bundling adds no risk, and REQ-113 adds none to the register (LOW, `@risk-deferred`).
- **Reference:** commit range `origin/main..HEAD`
