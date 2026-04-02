# AI Prompts Log — REQ-021

**AI Tool:** Claude Code (Claude Opus 4.6)

## Prompt 1: Implementation and Tests

User requested implementation of #44 (crate/unit packaging for inventory items). AI modified:

- `interfaces/inventory.interface.ts` — added crateSize, packagingType
- `models/inventory-model.ts` — added fields to schema
- `components/features/admin/menu-item-form.tsx` — added form fields (create)
- `components/features/admin/menu-item-edit-form.tsx` — added form fields (edit)
- `app/actions/admin/menu-actions.ts` — parse and save new fields in create + update
- `services/restock-recommendation-service.ts` — added crate fields to item interface, compute cratesToOrder
- `components/features/inventory/restock-recommendations-client.tsx` — crate breakdown display, CSV columns

AI created:

- `__tests__/inventory/crate-packaging.test.ts` — 15 unit tests

## Bug Fix: Serialization Gap

During UAT verification, user reported crateSize and packagingType not persisting after save. AI identified root cause: `app/dashboard/menu/[itemId]/edit/page.tsx` omitted the new fields from the inventory serialization object. Fixed in `556418c`. Added 3 regression tests in `d88719c`.
