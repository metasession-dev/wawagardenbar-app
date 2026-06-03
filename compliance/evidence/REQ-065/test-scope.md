# REQ-065 — Test scope

## In scope (unit)

- Rate-limit utility: first call allowed; second call within window blocked with correct retryAfter; call after window allowed; key independence.
- Data-export endpoint: 401 unauthenticated; envelope 9-key shape; every find filter keyed on `session.userId` (no cross-user reads from endpoint shape); Content-Disposition filename composed from `userId` + date; 429 within-window with Retry-After header.

## In scope (E2E)

- `e2e/smoke/data-export-auth-gate.spec.ts` — live AC3 verification: direct unauthenticated GET to `/api/user/export` returns 401 + `error` body.
- `e2e/smoke/cookie-consent-banner.spec.ts` — 2 live cases for AC5:
  - First-visit banner appears → "Got it" click persists `{ acceptedAt, version: 'v1' }` to `localStorage.cookieConsent` → banner dismisses → reload skips it.
  - Pre-seeded `cookieConsent` causes banner to NOT render on page load.
- `evidenceShot` captures land at `compliance/evidence/REQ-065/screenshots/`.

## Deferred to manual UAT (`test.fixme`'d)

- `e2e/smoke/data-export-customer-flow.spec.ts` — AC4 (customer Download-my-data button triggers a JSON download). Blocked by the same SMS-fatal customer-auth issue that `test.fixme`'s `e2e/smoke/customer-auth.spec.ts`. Un-fixme path documented inline. Unit + service layer is the load-bearing gate until then.

## Out of scope

- Cookie banner component-level test in vitest. No project precedent — vitest config is node-only. The live E2E covers the same surface end-to-end and tags `evidenceShot` captures.
- Visual regression. Project doesn't use visual regression; the banner is one-off Card-styled UI; over-investment.
- Performance/load on the export endpoint. Bounded by the user's own data footprint (orders/tabs cap at lifetime usage, not a worst-case multi-MB scenario). Rate-limit prevents the trivial flood case. Future REQ can add backpressure / paging if a heavy customer ever needs it.

## Manual UAT — what to check

1. **Logged-in customer** — visit `/profile` → "Your data" Card → click "Download my data" → browser downloads `wawa-data-{your-id}-{today}.json`. Open it; verify the 9 collections are populated with YOUR data (no other user's).
2. **Rapid double-click** — click the Download button twice in quick succession. First fires a download; second toast shows "Rate limit — try again in N seconds".
3. **Cookie banner — first session** — open the site in a fresh browser (or clear localStorage). Banner appears at the bottom. Click "Got it" — banner dismisses. Reload — banner stays absent.
4. **Cookie banner — private mode** — open in incognito. Banner appears. Click "Got it" — banner dismisses for the session (localStorage write may or may not persist depending on browser).
5. **Profile page rendering** — verify the existing tabs (Personal Info, Addresses) still render alongside the new "Your data" Card (no regression on the existing surface).
