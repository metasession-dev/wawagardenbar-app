# E2E Test Suite — Setup & Run Guide

## Overview

The E2E test suite uses **Playwright** to verify all 27 sections of `docs/REQUIREMENTS.md`. It consists of **183 tests** across three projects:

| Project | File | Tests | Description |
|---------|------|-------|-------------|
| `chromium` | `e2e/requirements-verification.spec.ts` | 142 | Unauthenticated — public pages, API contracts, security |
| `auth-setup` | `e2e/auth.setup.ts` | 2 | Logs in as admin & super-admin, saves session cookies |
| `authenticated` | `e2e/authenticated.spec.ts` | 39 | Dashboard, orders, menu, inventory, reports, settings |

## Prerequisites

1. **MongoDB** running locally on port 27017
2. **Node.js** 18+ and npm
3. **Playwright browsers** installed: `npx playwright install chromium`

## First-Time Setup

### 1. Seed E2E admin users

The authenticated tests require two dedicated test users in the database:

```bash
npx tsx scripts/seed-e2e-admins.ts
```

This creates (idempotent — safe to re-run):
- `e2e-admin` (role: admin, all permissions)
- `e2e-superadmin` (role: super-admin)

### 2. Verify `.env.local` credentials

Ensure these entries exist in `.env.local`:

```env
E2E_ADMIN_USERNAME=e2e-admin
E2E_ADMIN_PASSWORD=E2eTest@2026!
E2E_SUPER_ADMIN_USERNAME=e2e-superadmin
E2E_SUPER_ADMIN_PASSWORD=E2eTest@2026!
```

### 3. Ensure `.auth/` is gitignored

The auth setup saves session state files (containing cookies) to `.auth/`. This directory is already in `.gitignore`.

## Running Tests

```bash
# Run all tests (starts dev server automatically)
npx playwright test

# Run only unauthenticated tests
npx playwright test --project=chromium

# Run only authenticated tests (runs auth-setup first via dependency)
npx playwright test --project=authenticated

# Run with UI mode for debugging
npx playwright test --ui

# Run a specific test by name
npx playwright test -g "menu page loads"
```

## Test Architecture

### Unauthenticated Tests (`requirements-verification.spec.ts`)

- Tests public pages (home, menu, checkout, login, admin login)
- Tests public API endpoints (menu, rewards)
- Tests security controls (CORS, rate limiting, session config)
- Tests cart functionality via Zustand localStorage seeding
- API tests run in **serial mode** to avoid hitting the 30 req/min rate limit

### Auth Setup (`auth.setup.ts`)

- Logs in via the admin login form at `/admin/login`
- Saves `storageState` (cookies + localStorage) to `.auth/admin.json` and `.auth/super-admin.json`
- If credentials are missing or login fails, saves empty state — authenticated tests will skip gracefully

### Authenticated Tests (`authenticated.spec.ts`)

- Uses Playwright's `storageState` fixture to reuse saved sessions
- `beforeEach` hook verifies the session is valid; skips the test if not
- Admin tests: orders dashboard, tab management, kitchen display
- Super-admin tests: dashboard overview, menu management, inventory, finance, reports, rewards, settings, audit logs, customers

### RBAC Coverage

- Admin users are redirected from `/dashboard` to `/dashboard/orders`
- Super-admin users can access `/dashboard` overview with stats cards
- Menu management, inventory, finance, reports, rewards, settings, audit logs, and customers are super-admin only

## Reports & Evidence

After a test run, reports are generated at:

- **HTML report**: `playwright-report/` — open with `npx playwright show-report`
- **JSON results**: `compliance/evidence/REQ-007/e2e-results.json` — machine-readable for compliance
- **Screenshots**: captured for every test (`screenshot: 'on'` in config)

## Troubleshooting

### Tests skip with "Admin login failed"
- Run `npx tsx scripts/seed-e2e-admins.ts` to create/reset test users
- Verify `.env.local` has the `E2E_*` credentials
- Check that the dev server is running and MongoDB is accessible

### API tests fail with 429
- The rate limiter allows 30 requests/minute per IP
- API tests are configured as serial to minimize this, but a rapid re-run may still trigger it
- Wait ~60 seconds between full runs, or restart the dev server to reset rate limit counters

### "Target page, currentContext or browser has been closed"
- Usually caused by the dev server crashing mid-test
- Check `npm run dev` console output for errors
- Ensure MongoDB is running and the database specified in `MONGODB_DB_NAME` exists
