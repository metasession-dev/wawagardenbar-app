## Bundled Changes

- **Core tracked release:** `REQ-104` (declared bundle key; co-tracked with REQ-105, REQ-106)
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-104.json`
- **Manifest hash:** `sha256:910dda8e20537ae0c8983395a32bec2fb4f32855cda111b86383a2f639a0fd15`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-104 REQ-105 REQ-106
- **Absorbed non-release work:** housekeeping commits since `main`
- **Why bundled here:** REQ-104, REQ-105, and REQ-106 were declared as an explicit bundle at Phase 1 planning time (`Bundles: #767, #768, #769`) — all three are LOW/MEDIUM risk, share one branch/PR/release cycle, and touch distinct file sets with no scope overlap between them.
- **Evidence impact:** Evidence ownership remains on each source REQ; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope covers all three co-tracked REQs plus the absorbed non-release housekeeping work listed below.
- **Security / risk impact:** Bundle ceremony runs at MEDIUM (the max risk across the set, from REQ-106). No additional security/risk impact beyond what each REQ's own risk-register entries (R-029/R-030/R-031 for REQ-106) already document.
- **Reference:** commit range `main..HEAD`

### Explicit Constituent Releases

- None

### Absorbed Non-Release Work

- `9653126` chore: sync SDLC templates from DevAudit (v1.4.0 → v1.4.2) (#765)
- `ff9dab0` test: retry the read-only request-fixture blocks in the critical E2E tier
- `dd02aa3` ci: route e2e-regression.yml through CI_RUNNER_LABEL like every other workflow
- `4d7bec4` ci: wipe .next before every run to prevent cross-run build corruption (again)
- `ecdcf41` ci: drop always-failing --with-deps attempt from Playwright install (again)
- `318832a` build: bump next/sharp/nodemailer/js-yaml to clear high/critical advisories
- `41c9ac6` ci: don't mark post-deploy E2E Regression tier as a required portal check
- `dda99c7` chore: sync SDLC templates from DevAudit (v1.4.0)
- `a628b92` test: fix stock-state assumption in menu-category-cascade spec (#725)

### Co-Tracked Bundle Members

Declared co-primary at Phase 1 planning time (devaudit-installer#736) — not absorbed predecessors, each keeps fully isolated per-REQ evidence:

- `REQ-104` (co-tracked/bundled) — Expense Tags
- `REQ-105` (co-tracked/bundled) — Expense edit dialog full field visibility
- `REQ-106` (co-tracked/bundled) — Cash Position tracking + Cash Deposits
