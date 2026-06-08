# REQ-075 — Security summary

## Surface review

This REQ relaxes a schema constraint (Mongoose `enum` on `MenuItem.mainCategory` and `InventorySnapshot.mainCategory`) and moves validation to the application layer via a new `MainCategoryService`. It exposes a new admin-only surface for managing the main-category registry through `/dashboard/settings`. It also changes the shape of one public read endpoint (`GET /api/public/menu/categories`).

## STRIDE pass on the new admin surface

| Threat                     | Surface                                                            | Status                                                                                                                                                                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spoofing**               | A non-super-admin invoking the create/update/rename/delete actions | Not possible — every mutation funnels through `requireSuperAdmin` at the server action layer. The shared `withSuperAdmin` wrapper re-runs the role check on every call; no client-supplied role flag is honoured.                                                                     |
| **Tampering**              | A super-admin injecting a malicious slug                           | Slug is validated server-side against `MAIN_CATEGORY_SLUG_RE` (lowercase a-z + digits + hyphens, max 32 chars). Reserved slugs (`all`, `other`, `unknown`) are rejected. Duplicate slugs are rejected. Format errors raise before any write.                                          |
| **Repudiation**            | A rename/delete without an audit trail                             | Every write goes through `SystemSettingsService.updateMainCategories` which `$push`-es a `changeHistory` entry with `changedBy`, `changedAt`, and `reason` per the existing settings audit pattern. Same audit shape as REQ-028 expense categories.                                   |
| **Information disclosure** | `getMainCategoriesAction` returning sensitive data without auth    | The list is identical to the data already exposed publicly via `/api/public/menu/categories`. Intentionally unauthenticated to keep admin client filter dropdowns simple. No new information surface.                                                                                 |
| **Denial of service**      | Rename racing with concurrent writes                               | Sequential 3-step rename — between steps, a concurrent `update` on a different slug is safe (different SystemSettings keys + different MenuItem rows). Race on the SAME slug is bounded by the duplicate-slug guard at the top of `rename` (re-checks against current registry list). |
| **Elevation of privilege** | A renamed slug becoming a path traversal                           | Slug never lands in a filesystem path, shell command, or eval. It's used as a Mongo string-equality match (`{ mainCategory: slug }`) and as an object key in the `'menu-categories'` settings document. Mongo's BSON layer handles encoding.                                          |

## Reference-counted delete

Delete is server-side gated by `referenceCount(slug)` which counts `MenuItem.countDocuments({ mainCategory: slug })` + the length of the sub-category list under `'menu-categories'.[slug]`. Both reads happen before the delete write, in the same action call. A super-admin who deletes a slug they think is empty but isn't will see an error message naming both counts, not a successful delete.

## Public endpoint change (BREAKING)

`GET /api/public/menu/categories` envelope changes from `{ drinks: string[], food: string[] }` to `{ mainCategories: [{ slug, label, order, subCategories[] }] }`. Implications:

- **External consumers pinned to the old shape break.** This is operator-acknowledged and documented in the route's JSDoc, the REQ-071 spec, and the REQ-API-006 SRS amendment. Mitigation: the release ticket calls this out as a pre-merge check.
- **No new auth surface, no new data exposed.** The new envelope adds `label` and `order` which are not sensitive (already implicit in the customer menu render).
- **No regression on auth / rate-limit.** `withApiAuth(request, ['menu:read'], …)` wrapper unchanged; route-level rate-limit unchanged at 30 req/min.

## Schema relaxation impact

- Dropping `enum: ['drinks', 'food']` on `MenuItem.mainCategory` means a buggy admin write could land an unexpected slug. Mitigation: every admin write that touches `mainCategory` runs through either `MainCategoryService.create` (slug guards) or `app/actions/admin/menu-actions.ts` whose form Zod schema requires `mainCategory` to be one of the registered slugs (constrained at runtime by the Select options sourced from the registry).
- An attacker with super-admin access could `MenuItemModel.updateMany({}, { $set: { mainCategory: 'xss-payload' } })` directly. Same risk as pre-REQ-075 (a malicious super-admin can already trash any data). Not changed by this REQ.

## Compliance posture

- **No new packages, no new env vars, no new credentials.**
- **No data migration.** Default seed mirrors the historical `food` + `drinks` pair so existing documents continue to match.
- **No production DB touches required for the release.** UAT only for E2E + manual walkthrough (per `feedback_no_prod_db_touches`).
- **AuditLog writes preserved.** Every mutation cascades through the existing `SystemSettingsService` `changeHistory` audit array.

## What this REQ does NOT change

- Auth middleware (`withApiAuth`, `requireSuperAdmin`) — unchanged
- Rate-limiting on `/api/public/*` — unchanged
- AuditLog / change-history shapes — unchanged (new entries follow the existing pattern)
- Session creation, cookie handling, RBAC tables — completely unchanged
- The `MenuItem` document shape beyond the `mainCategory` enum constraint — unchanged

## Related

- REQ-071 (RELEASED v2026.06.05) — public API authenticated contracts; REQ-075 supersedes its `/api/public/menu/categories` envelope.
- REQ-028 (RELEASED) — expense categories admin form + audit trail; same `changeHistory` audit pattern reused here.
- REQ-033 (RELEASED) — units of measurement admin form; same registry-in-settings pattern.
