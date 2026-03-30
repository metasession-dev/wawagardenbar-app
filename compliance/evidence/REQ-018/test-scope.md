# Test Scope — REQ-018

**Risk Level:** MEDIUM
**Requirement:** Staff Pot — inventory loss deduction with configurable thresholds
**GitHub Issue:** #34
**Date:** 2026-03-30

## Test Approach

Full verification per Test Strategy medium-risk requirements.

**Universal gates (mandatory):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Additional medium-risk testing:**

- [ ] Independent review: second human reviewer required before merge

## Existing Tests Reviewed

| Test File                                             | Impact                                                                       | Action              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------- |
| `__tests__/staff-pot/staff-pot-calculation.test.ts`   | Payout calculations don't account for deductions                             | Add deduction tests |
| `__tests__/staff-pot/staff-pot-start-date.test.ts`    | No impact — date range logic unchanged                                       | No change needed    |
| `e2e/staff-pot.spec.ts`                               | Config form needs new fields; admin/super-admin views need deduction display | Update E2E tests    |
| `__tests__/reports/total-revenue-consistency.test.ts` | No impact — revenue logic unchanged                                          | No change needed    |

## Acceptance Criteria

### Configuration

- [ ] Enable/disable toggle for inventory loss deduction in Staff Pot settings (super-admin only)
- [ ] Separate food loss threshold (%) configurable
- [ ] Separate drink loss threshold (%) configurable
- [ ] Feature disabled by default
- [ ] Config persists across page reloads

### Loss Calculation

- [ ] Loss % = (systemInventoryCount - staffAdjustedCount) / systemInventoryCount \* 100 per snapshot item
- [ ] Only approved snapshots count toward loss calculation
- [ ] Food and drink losses calculated separately using `mainCategory`
- [ ] Excess loss = actual loss % - threshold %. No deduction if at or below threshold
- [ ] Deduction amount = excess loss % \* total inventory value for that category
- [ ] Food excess → deducted from Kitchen pot. Drink excess → deducted from Bar pot
- [ ] No deduction when feature is disabled

### Staff Pot Display — Admin View

- [ ] Shows "Inventory adjustment: -₦X,XXX" on Kitchen/Bar card if deduction applies
- [ ] Shows adjusted per-person bonus after deduction
- [ ] Does NOT show loss percentages, inventory values, or threshold details
- [ ] Shows motivational text: "Keep waste low to protect your bonus"

### Staff Pot Display — Super-Admin View

- [ ] Shows everything in admin view, plus:
- [ ] Loss % vs threshold for food and drink
- [ ] Inventory value and excess loss amount
- [ ] Deduction calculation breakdown

### Regression

- [ ] All existing E2E tests pass
- [ ] All existing unit tests pass
- [ ] Staff Pot calculations without deduction feature enabled remain unchanged

## Data Model Changes

- `StaffPotConfig` (SystemSettings): add `inventoryLossEnabled`, `foodLossThreshold`, `drinkLossThreshold`
- `StaffPotMonthData`: add `foodLoss`, `drinkLoss`, `kitchenDeduction`, `barDeduction` fields

## AI Involvement

- AI tool: Claude Code (Claude Opus 4.6)
- Code categories: service logic, config, UI components, unit tests, E2E tests
- Elevated review required for: financial deduction calculations, inventory data integration
