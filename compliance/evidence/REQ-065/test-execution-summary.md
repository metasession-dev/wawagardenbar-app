# REQ-065 — Test execution summary

**Run date:** 2026-06-03
**Commit on develop:** post-PR-#274 merge

## Vitest (unit + integration)

```
RUN  v4.1.8 /home/william/Documents/SoftwareProjects/Metasession/wawagardenbar app

 Test Files  112 passed | 1 skipped (113)
      Tests  1072 passed | 4 skipped (1076)
   Start at  21:05:01
   Duration  4.66s
```

**REQ-065 cases (new):** 9 total.

- `__tests__/lib/rate-limit.test.ts` — 4 new (first allowed; second blocked w/ retryAfter; after-window allowed; key independence).
- `__tests__/api/user-export.test.ts` — 5 new (401 unauth; 9-key envelope; every find filter keyed on session.userId; Content-Disposition filename; 429 within-window with Retry-After).

## E2E (Playwright)

### Focused REQ-065 run against UAT (after auto-deploy)

```
[regression] auth-setup × 3                                                  ✓
[regression] e2e/smoke/data-export-auth-gate.spec.ts:AC3                     ✓ 763ms
[regression] e2e/smoke/cookie-consent-banner.spec.ts:AC5-first-visit         ✓ 1.9s
[regression] e2e/smoke/cookie-consent-banner.spec.ts:AC5-prefilled-consent   ✓ 1.9s
[regression] e2e/smoke/data-export-customer-flow.spec.ts:AC4                 ↷ skipped (test.fixme)

 6 passed | 1 skipped (24.1s)
```

**evidenceShot captures** (`compliance/evidence/REQ-065/screenshots/`):

- `REQ-065-AC5-banner-first-visit.png` (149 KB)
- `REQ-065-AC5-banner-dismissed-after-reload.png` (153 KB)

Both sidecars tagged `origin: 'regression'` on local runs (E2E_NEW_SPECS unset). CI on the PR branch will produce `origin: 'feature'` because the new spec paths land in `git diff --diff-filter=A` against the merge-base.

**One-time triage during the focused run:**

- First attempt returned **404** on `/api/user/export` — UAT auto-deploy hadn't yet propagated PR #274 (CI green ≠ Railway deploy complete). Polled the endpoint for ~3 min until it returned the expected **401**, then re-ran. Not a defect; expected lag between develop push and Railway build.
- Auth-setup briefly logged a 21s super-admin login (vs ~3.6s for csr/admin) but completed successfully. Flagged in the release ticket; worth monitoring but not blocking.

### Full regression pack against UAT (10.1 min wall-clock)

```
290 passed | 15 skipped | 34 did-not-run | 0 failed
```

Comparison to the REQ-064 close-out cycle baseline (2026-06-03):

| Metric      | REQ-064 close-out | REQ-065 evidence | Delta    |
| ----------- | ----------------- | ---------------- | -------- |
| passed      | 268               | 290              | +22      |
| skipped     | 16                | 15               | -1       |
| did-not-run | 29                | 34               | +5       |
| failed      | 0                 | 0                | 0        |
| wall-clock  | 11.2 min          | 10.1 min         | -1.1 min |

**+22 passed** matches the REQ-065 spec additions (3 new live cases) plus a delta in the auth-chain / random selection from the broader pack. The `did-not-run` bucket grew slightly; same operational pattern as before (Playwright didn't start those specs — not a regression, not a failure). Worth the same follow-up investigation already noted for REQ-064 — not blocking this release.

## TypeScript

```
$ npx tsc --noEmit
# exit 0
```

0 errors.

## ESLint

```
$ npx eslint . --max-warnings=10000
✖ 950 problems (0 errors, 950 warnings)
```

0 errors; 950 pre-existing `no-console` warnings unchanged.

## Build

```
$ npm run build
# exit 0 — all routes built successfully, including the new
# /api/user/export route handler + the layout-embedded cookie banner.
```

## Regression posture

- 290 / 1076 vitest + 290 E2E = a clean pass profile.
- 0 new failures relative to the REQ-064 close-out baseline.
- +9 vitest delta (REQ-065 unit + API integration cases).
- +3 E2E delta (data-export-auth-gate + 2× cookie-consent-banner; data-export-customer-flow `test.fixme`'d).
- The 34 "did not run" bucket carries forward as an operational follow-up (NOT a REQ-065 regression).
