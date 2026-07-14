# Implementation Plan — REQ-092

**Issue:** [#485](https://github.com/metasession-dev/wawagardenbar-app/issues/485)
**Title:** Fix post-merge regression: `menu-category-cascade` E2E timing out on `[aria-disabled="false"]` selector
**Risk class:** LOW
**Author:** sdlc-implementer@1.0
**Date:** 2026-07-13

---

## Summary

Post-merge E2E regression on `main` (commit `5336b4e`). The `menu-category-cascade.spec.ts` test `REQ-082: progressive category display › express order shows items on landing grouped by category...` times out consistently (3 retries) at line 95: `await page.locator('[aria-disabled="false"]').first().click()`.

**Root cause:** After filling the search field (`page.getByTestId('category-cascade-search').fill(firstItemName)`), the test waits a hard-coded 400ms before attempting to click an `[aria-disabled="false"]` item. In a slow CI environment (resource contention after a 23-minute regression run), the React state update + re-render triggered by the search-action server refetch has not completed within 400ms. Playwright's 30s timeout eventually fires because the enabled item never appears within that window.

**Fix scope:** Test-only. Replace `waitForTimeout` hard waits before `[aria-disabled="false"]` clicks with Playwright `waitFor` assertions that block until the item is actually visible and enabled. No application code changes.

---

## Acceptance criteria

| AC | Description | SRS-ID | Verification |
|----|-------------|--------|--------------|
| AC1 | The `express order shows items on landing...` test passes consistently in CI without timing out on the item click at line 95 | REQ-TEST-001 @srs-deferred | E2E — `menu-category-cascade.spec.ts` regression run |
| AC2 | The fix replaces hard `waitForTimeout` waits before item clicks with Playwright `waitFor`/`toBeVisible` locator assertions | REQ-TEST-001 @srs-deferred | Code review |
| AC3 | All other tests in `menu-category-cascade.spec.ts` continue to pass | REQ-TEST-001 @srs-deferred | E2E regression suite |
| AC4 | No application code (`app/`, `lib/`, `services/`, `models/`) is modified | N/A | Code review / diff |

---

## Technical approach

### Change

`e2e/menu-category-cascade.spec.ts` — single test (`express order shows items...`):

1. **Line 89 — after search fill:** Replace `waitForTimeout(400)` with `await expect(page.locator('[aria-disabled]').first()).toBeVisible()` to confirm items have rendered before attempting to read their text.

2. **Line 95 — before first item click:** Insert `await expect(page.locator('[aria-disabled="false"]').first()).toBeVisible()` before `.click()` to ensure an enabled item is present in the DOM before clicking.

3. **Lines 99-100 — after search clear:** Replace `waitForTimeout(400)` with `await expect(page.locator('[aria-disabled]').first()).toBeVisible()` to confirm landing items reappear after clearing search.

4. **Line 115 — second item click after category switch:** Insert `await expect(page.locator('[aria-disabled="false"]').first()).toBeVisible()` before `.click()`.

The `findMainCategoryWithContent` helper uses `.count()` which is safe (returns 0 immediately if nothing matches, no timeout). No change needed there.

### Why `toBeVisible` not `waitForSelector`

Playwright's `expect(locator).toBeVisible()` uses the configured `expect.timeout` (default 5s, CI 30s) and retries until the element appears — semantically correct for "wait until items have rendered after async state update." It's also more readable and consistent with the rest of the spec's assertion style.

---

## Files to change

| File | Change |
|------|--------|
| `e2e/menu-category-cascade.spec.ts` | Replace 2× `waitForTimeout` + add 2× `toBeVisible` guards before clicks |

---

## Test scope

E2E test: `e2e/menu-category-cascade.spec.ts` — the fix is within the spec itself. The full regression suite (`npx playwright test --project=regression`) verifies all ACs.

---

## Architecture decisions

No ADR needed — test-only change, no runtime architecture affected.

---

## Risk register entries

No new risk register entries — LOW risk, no auth/payment/PII/RBAC surface.

---

## Framework attribution

| Clause | Coverage |
|--------|----------|
| ISO 29119 §3.4 Test Plan | AC table above |
| ISO 27001 A.8.25 Secure SDLC | No secrets/dependencies changed; test-only |
| GDPR Art. 25 | No personal data in scope |
| EU AI Act Art. 11 | No AI model in scope |
