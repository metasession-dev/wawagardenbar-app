# REQ-065 — Bundle D (self-service data export + cookie consent banner)

**Status:** IN PROGRESS · **Risk:** MEDIUM · **Issue:** #117 P4 #19 + P4 #20

## Context

P4 #19 asks for a customer-facing "Download my data" endpoint returning the user's full data footprint as JSON — GDPR-style hygiene. P4 #20 asks for a cookie-consent banner. The app currently has no analytics scripts wired, so the banner is **informational + forward-compatible**: when analytics is added later, the gate is already there.

Both items are P4 (compliance/data hygiene). Bundling makes sense because both touch the user's privacy posture and ship roughly the same amount of code.

P4 #21 (signup-time consent capture) is NOT in this REQ — it landed under REQ-063 with the explicit-consent split (operator decision recorded 2026-06-03 to bundle B's PIN-flow work together).

## Acceptance criteria

1. **AC1 — `/api/user/export` endpoint.** A session-authenticated GET endpoint that returns JSON of the user's data footprint across these collections:
   - `profile` — User doc minus secrets (`verificationPin`, `pinExpiresAt`, `sessionToken`).
   - `orders` — `OrderModel.find({ userId })` ordered newest-first.
   - `pointsTransactions` — `PointsTransactionModel.find({ userId })`.
   - `tabs` — `TabModel.find({ userId })`.
   - `rewards` — `RewardModel.find({ userId })`.
   - `supportTickets` — `SupportTicketModel.find({ userId })` (from REQ-064).
   - `notificationLog` — `NotificationLogModel.find({ userId })` (from REQ-055).
   - `incomingMessages` — `IncomingMessageModel.find({ userId })` (from REQ-056).
   - `instagramPostCredits` — `InstagramPostCreditModel.find({ userId })` (from REQ-059).
   - Envelope: `{ exportedAt: ISO8601, userId, ...collections }`.
2. **AC2 — Rate limit.** One export request per user per 60 seconds (in-memory ring buffer). Returns 429 with `{ error: 'Rate limit — try again in N seconds' }` if exceeded.
3. **AC3 — Session gate.** Unauthenticated requests get 401. No cross-user reads (every find is keyed on `session.userId`).
4. **AC4 — `<DataExportLink />` UI** added to `/profile` (or a dedicated section) — single button "Download my data" → fetches `/api/user/export`, triggers a browser download as `wawa-data-{userId}-{YYYY-MM-DD}.json`.
5. **AC5 — Cookie consent banner.** Client component `<CookieConsentBanner />` rendered from a layout. On first visit (`localStorage.cookieConsent === null`), shows a fixed bottom banner: short copy + a single "Got it" button. Click persists `{ acceptedAt: ISO8601, version: 'v1' }` to `localStorage.cookieConsent` and dismisses. Subsequent visits skip the banner.

## Technical approach

### Data export endpoint (1 new file)

`app/api/user/export/route.ts` — GET handler.

- Reads session via `getIronSession`. Returns 401 if not logged in.
- Rate-limit check via `lib/rate-limit.ts` (new — module-level `Map<userId, lastTimestamp>`; expires entries older than the window). Returns 429 if hit.
- Parallel `find().lean()` against the 9 collections, all keyed on `session.userId`.
- Builds JSON envelope, returns with `Content-Disposition: attachment; filename="wawa-data-{userId}-{date}.json"`.

### Rate-limit util (1 new file)

`lib/rate-limit.ts` — `checkRateLimit(key: string, windowMs: number): { allowed: boolean; retryAfterSec: number }`. In-memory `Map<string, number>` (last-allowed timestamp per key). Forward-compatible: a future REQ can swap to Redis without changing callers.

### Data-export UI (1 new component + 1 modified page)

- `components/features/profile/data-export-button.tsx` — client component. Calls `fetch('/api/user/export')`, on 200 builds a `Blob`, triggers download. On 429 toasts the retry-after.
- `app/(customer)/profile/page.tsx` — adds a section "Your data" with the button + a short paragraph explaining what's exported.

### Cookie consent banner (1 new component + 1 modified layout)

- `components/shared/cookie-consent-banner.tsx` — client component. Reads localStorage on mount; if absent, renders a `Card`-styled bottom-fixed banner; "Got it" button writes the timestamp + dismisses.
- `app/(customer)/layout.tsx` (or `app/layout.tsx` if cleaner) — embeds the banner. Renders client-side only (no SSR mismatch — render guard on `useEffect`).

## Risk

**MEDIUM.** Data-egress surface (export endpoint) is the load-bearing concern. Mitigated by:

- Server-side session gate — no anonymous access.
- Every query keyed on `session.userId` — no cross-user read possible from the endpoint shape.
- Rate-limit prevents trivial dump-bots (60s window is plenty for a real user clicking once).
- No new env vars, no new packages.

Cookie banner is LOW risk on its own (UI + localStorage; no server impact).

## Security considerations

- **STRIDE on the export endpoint:**
  - _Spoofing_: session cookie required; no API-key path.
  - _Tampering_: response is read-only DB extracts; nothing to tamper server-side.
  - _Repudiation_: every successful export is a query event in the application log (already-logged via the API route); no new audit needed.
  - _Information disclosure_: response is exactly the user's own data — never another user's. The find filters are keyed on `session.userId`. Secrets (PIN, sessionToken) are projected out of the User doc explicitly.
  - _DoS_: rate-limit + the response size is bounded by the user's own data footprint (orders, tabs etc. cap at the user's lifetime usage; not a worst-case 100MB scenario for any single user).
  - _Elevation of privilege_: none — endpoint never exposes admin data.
- **Cookie banner** has no security surface — pure client UI.

## Dependencies

- REQ-055 (RELEASED) — NotificationLog model the export reads from.
- REQ-056 (RELEASED) — IncomingMessage model the export reads from.
- REQ-059 (RELEASED) — InstagramPostCredit model the export reads from.
- REQ-064 (RELEASED) — SupportTicket model the export reads from.

## Test scope

Vitest cases (target ~7):

1. `rate-limit.test.ts` — first call allowed, second call within window blocked + correct retryAfter.
2. `rate-limit.test.ts` — call after window elapsed allowed.
3. `data-export.unauthenticated.test.ts` — 401 when no session.
4. `data-export.shape.test.ts` — envelope keys + ISO8601 `exportedAt` + projected User doc has no `verificationPin` / `sessionToken`.
5. `data-export.cross-user.test.ts` — every find call uses `session.userId` (mock the models, assert the filter shape).
6. `data-export.rate-limit-integration.test.ts` — second request within window returns 429.
7. `cookie-consent-banner.test.ts` — renders when localStorage empty; doesn't render when `cookieConsent` is set.

E2E for the download flow + banner shown-once behaviour deferred to manual UAT per `project_e2e_targeted_until_117`. (Could add `e2e/smoke/data-export.spec.ts` + `e2e/smoke/cookie-consent.spec.ts` if the operator opts in mid-cycle — matches the REQ-064 pattern.)

## Plan deviation

_(to be filled if implementation requires divergence)_
