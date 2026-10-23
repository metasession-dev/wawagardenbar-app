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
