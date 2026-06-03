# REQ-063 — Test execution summary

**Run date:** 2026-06-03
**Commit on develop:** post-PR-#266 merge

## Vitest (unit + integration)

```
RUN  v4.1.8 /home/william/Documents/SoftwareProjects/Metasession/wawagardenbar app

 Test Files  106 passed | 1 skipped (107)
      Tests  1047 passed | 4 skipped (1051)
   Start at  14:23:10
   Duration  4.28s
```

**REQ-063 cases (new):** 8 total.

- `__tests__/models/user-model.preferences.test.ts` — 3 new (default false, override honoured, audit-timestamp accepts Date).
- `__tests__/services/notification-service.email-marketing-gate.test.ts` — 3 new (marketing blocked, marketing allowed, transactional unaffected).
- `__tests__/actions/verify-pin.optin-payload.test.ts` — 2 new (first-verify persists three independent booleans + audit stamp, returning user is no-op).

**Updated:**

- `__tests__/actions/auth/verify-pin-opt-in.test.ts` — REQ-053 payloads extended with `emailMarketing: false/true` (TS contract).
- `__tests__/services/notification-service.test.ts` — REQ-054 fixtures: 2 cases flipped `emailMarketing: true` so the channel-fallback assertion still holds.

## TypeScript

```
$ npx tsc --noEmit
# exit 0
```

0 errors.

## ESLint

```
$ npx eslint . --max-warnings=0
✖ 950 problems (0 errors, 950 warnings)
```

0 errors; 950 pre-existing `no-console` warnings (unchanged from develop baseline).

## Build

```
$ npm run build
# exit 0 — all routes built successfully
```

## CI (post-merge to develop)

| Workflow                   | Run ID      | Status  |
| -------------------------- | ----------- | ------- |
| CI Pipeline                | 26888266053 | SUCCESS |
| Compliance Evidence Upload | 26888266061 | SUCCESS |
| CI Status Fallback         | 26888266034 | SUCCESS |

## Regression posture

- 1047 / 1051 = 99.6% pass rate (4 skipped are pre-existing).
- 0 new failures relative to the REQ-062 develop baseline (1039 pass).
- +8 cases delta: matches the planned REQ-063 test additions.
