# AI Prompts Log — REQ-022

**AI Tool:** Claude Code (Claude Opus 4.6)

## Prompts

1. **Analysis:** "what is the typical approach we should be using to record sales, prices etc" — led to discovery of financial report cost snapshot bug and duplicate cost field
2. **Investigation:** Explored how `costPerUnit` flows from menu item → order → report, identified 3 locations using `inventory.costPerUnit` instead of `item.costPerUnit` from orders
3. **Implementation:** Implemented Part A (report fixes), Part B (form field removal), Part C (inventory auto-sync) per approved implementation plan
4. **E2E tests:** Created `e2e/cost-snapshot.spec.ts` — tests caught that create form also had the duplicate field
