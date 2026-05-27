# E2E Test Suite

Playwright end-to-end tests for Wawa Garden Bar. This suite is the **regression
gate** for the SDLC: it runs in CI, blocks merges, and is maintained
per-change. The requirements it verifies are defined in
[`docs/SRS.md`](../docs/SRS.md) (IDs `REQ-<AREA>-NNN`, each tagged a Suite).

## Suites & projects

Selection is by **Playwright project**, scoped by spec location (see
`playwright.config.ts`):

| Project      | Scope                                                       | Where it runs                                  |
| ------------ | ----------------------------------------------------------- | ---------------------------------------------- |
| `auth-setup` | Logs in csr/admin/super-admin → `.auth/*.json` storageState | Dependency of `smoke` + `regression`           |
| `smoke`      | `e2e/smoke/**.spec.ts` + `requirements-verification.spec.ts` | **Every develop push + PR** (`ci.yml` Gate 4)  |
| `regression` | **All** `*.spec.ts` (smoke + every feature spec)            | **PR→`main` + nightly** (`e2e-regression.yml`) |

**Suite membership is by location** (low-churn, self-service): a new
critical-path test goes under `e2e/smoke/`; feature/regression specs live in
`e2e/` and its area subdirs (`orders/`, `kitchen/`, `finance/`, `settings/`,
`customer/`, `api/`, `security/`). This maps to the SRS **Suite** column —
`Must` → smoke, `Should`/`Could` → regression.

## Running locally

```bash
# 1. Mongo running locally on :27017, then seed:
npx tsx scripts/seed-e2e-admins.ts      # e2e-admin / e2e-superadmin / e2e-csr (E2eTest@2026!)
npx tsx scripts/seed-food-menu.ts
npx tsx scripts/seed-drinks-menu.ts
npx tsx scripts/seed-inventory.ts

# 2. Run a suite (auto-starts dev server unless BASE_URL is set):
npx playwright test --project=smoke
npx playwright test --project=regression

# Target a deployed env:
BASE_URL=https://wawagardenbar-app-uat.up.railway.app npx playwright test --project=regression

# One spec / one requirement:
npx playwright test e2e/kitchen/recipe-and-production.spec.ts
npx playwright test -g "REQ-034"
```

Credentials are read from `.env.local` (`E2E_ADMIN_*`, `E2E_SUPER_ADMIN_*`,
`E2E_CSR_*`). Without them, `auth-setup` saves empty state and authenticated
specs **skip** locally. **In CI they hard-fail instead of skipping** — a green
CI run means the suite actually executed (see `e2e/auth.setup.ts`).

## CI wiring

- **`ci.yml` Gate 4** (DevAudit-generated) seeds the DB and runs
  `--project=smoke`. The seed step + E2E credentials come from
  `sdlc-config.json` → `e2e_setup_command` / `e2e_env` (regenerated into
  `ci.yml`; **requires devaudit ≥ 0.1.16**). Don't hand-edit `ci.yml` — change
  `sdlc-config.json` and re-run `devaudit update`.
- **`e2e-regression.yml`** (project-owned, not DevAudit-generated — survives
  syncs) runs `--project=regression` on PR→`main` and nightly.

## Conventions

- **Auth via fixtures**, not project-level storageState:
  `base.extend({ storageState: ADMIN_FILE })` (see `e2e/kitchen/helpers.ts` for
  `superAdminTest` / `adminTest` / `csrTest`). Don't add parallel auth infra.
- **Traceability:** reference the SRS `REQ-<AREA>-NNN` ID and the numeric
  `REQ-XXX` (used by `compliance/RTM.md`) in the spec's header/`describe`, and
  name AC tests `AC<n>: …`.
- **Evidence:** call `evidenceShot(page, 'REQ-XXX', 'AC<n>-…')`
  (`e2e/helpers/evidence.ts`) at the assertion that proves an AC — lands in
  `compliance/evidence/<REQ-ID>/screenshots/`.
- **Data isolation:** create per-test data with `uniqueLabel(prefix)` and clean
  up; don't depend on other specs' state.
- **Known gaps:** do **not** assert behaviour the SRS §4 table flags as a stub
  or known defect (receipt-download button, tab-checkout rewards, webhook
  idempotency, cancel points-reversal) until the linked #117 item ships.

## Maintenance model (how this stays a real regression suite)

Every SDLC change keeps the suite current via the **`e2e-test-engineer`**
skill — the sdlc-implementer's delegate for all e2e work:

1. When implementing a `REQ-XXX`, invoke `e2e-test-engineer`. It derives
   scenarios from the acceptance criteria + diff, **reconciles with this pack**
   (adds missing, updates shifted, retires obsolete — deletions only with
   confirmation), runs the suite, and files defects.
2. New critical-path coverage → `e2e/smoke/`; feature coverage → the area
   subdir. Tag back to the SRS `REQ-<AREA>-NNN` it verifies.
3. When a #117 known-defect is fixed, remove its SRS §4 gap note and add/repair
   the asserting test.

The smoke gate protects every push; the regression suite protects every
release. See `docs/SRS.md` §3 for the full E2E stack reference. (Naming the SRS
in the implementer flow is tracked upstream in DevAudit-Installer#64.)
