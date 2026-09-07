---
adr_id: 'ADR-004'
status: 'Accepted'
date: '2026-09-04'
authored_by: 'sdlc-implementer / claude-sonnet-5'
related_reqs: ['REQ-102']
supersedes: []
superseded_by: null
---

# ADR-004: Centralize time-window price precedence in a single resolver function

## Status

**Accepted**

## Context

REQ-102 adds two more selling prices to every menu item (`showPrice`, `happyHourPrice`) on top of the existing `price`, each activated by its own independently-configurable daily time window, with a defined precedence when windows overlap (happy-hour > show > default). This precedence decision is consumed in three structurally different places: the shared order-line reconciler (`lib/order-line-totals.ts`, itself already the single source of truth for all three order-creating paths per its own header comment), the public menu display API, and (indirectly) the bulk "Edit All" admin page. The risk classification for this REQ is HIGH specifically because it changes the price actually charged at the point of sale — a precedence bug has immediate financial impact, unlike the REQ-100/REQ-101 reporting-only bugs that preceded it (both MEDIUM).

## Decision

Precedence is resolved by one function, `SettingsService.resolveActivePriceField(): 'happyHourPrice' | 'showPrice' | 'price'`, built on top of two new window-check methods (`isShowPriceActive()`, `isHappyHourActive()`) that mirror the existing `isWithinBusinessHours()` convention exactly (same `hhmmToMinutes` helper, same same-day-only comparison, same cached-settings read). Every consumer — the order reconciler, the public menu API, the bulk-edit page's read path — calls this one function rather than re-implementing the happy-hour-wins-over-show-wins-over-default comparison locally. The manual price-override branch in `lib/order-line-totals.ts` (REQ-089) is left completely untouched and is applied strictly after this resolution, so it always wins regardless of window state.

## Consequences

- **Good:** The precedence rule exists in exactly one place. A future change to precedence (e.g. adding a third window type) touches one function, not N call sites. Unit tests against `resolveActivePriceField()` alone cover all downstream consumers' precedence behaviour by construction.
- **Good:** Reuses the already-proven `businessHours`/`isWithinBusinessHours()` pattern and the already-proven price-history snapshot pattern verbatim — no new architectural primitive is introduced, which keeps the HIGH-risk surface area as small as the feature allows.
- **Bad:** `resolveActivePriceField()` reads current server time with no timezone conversion (same limitation `isWithinBusinessHours()` already has) — correct only as long as the server's local time matches the restaurant's timezone. This is a pre-existing assumption in the codebase, not a new one introduced here, but REQ-102 doubles the number of features depending on it.
- **Neutral / tradeoffs:** Both new windows are single daily windows (same start/end every day), not per-weekday like `businessHours`. This was an explicit product decision (confirmed with the operator during requirements clarification), trading configuration flexibility for a simpler settings UI; per-weekday windows can be added later as a schema-compatible extension if needed (each window's shape would grow from `{enabled,start,end}` to a per-day map, matching `businessHours`'s existing shape).

## Alternatives considered

- **Alternative 1: Resolve precedence independently at each call site (order reconciler, menu API, bulk-edit page).** Ruled out because it triples the surface for a precedence bug and violates the single-source-of-truth principle `lib/order-line-totals.ts`'s own header comment already establishes for pricing logic.
- **Alternative 2: Fold `showPrice`/`happyHourPrice` into the existing `portionOptions` surcharge pattern (percentage-of-base + optional surcharge) instead of independent absolute prices.** Ruled out because `showPrice`/`happyHourPrice` are business-set absolute prices unrelated to portion size — conflating the two would make an unrelated existing feature (portion surcharges) responsible for happy-hour pricing math it has nothing to do with, and would prevent independently discounting (or premium-pricing) a "show price" that has no fixed mathematical relationship to the default price.

## Cross-references

- Implementation plan: `compliance/plans/REQ-102/implementation-plan.md`
- SRS items: REQ-ORDER-006 (new — order-time precedence), REQ-MENU-008 (new — display precedence), REQ-MENUMGT-008 (new — price editing), REQ-SETTINGS-001 (existing, updated — window configuration)
- Risk register: populated by `risk-register-keeper` (see plan §5 Risk register entries)
- Supersedes / superseded-by: none
