## Bundled Changes

- **Core tracked release:** `REQ-121`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-121.json`
- **Manifest hash:** `sha256:39887ff8e40fa556a21c1156923d81fa7ae8c733c082f171e68062cae15ae511`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-122
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** Explicit predecessor release tickets and non-release work are consolidated under approval envelope `REQ-121`.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes the core tracked release plus the explicit predecessor releases and non-release work listed below.
- **Security / risk impact:** No additional security/risk impact identified automatically; reviewer must confirm in the canonical release artifacts.
- **Reference:** commit range `origin/main..HEAD`

### Explicit Constituent Releases

- None

### Absorbed Non-Release Work

- `58f3f84c` chore: run only smoke and critical in the PR authenticated E2E step
- `1656c413` chore: require the UAT pack on every REQ (uat.human_pack always)
- `fe59e301` chore: set uat.mode to auto (agent-executed UAT)
- `a29d71ce` chore: devaudit configure - full release gate, ephemeral e2e data, seed config
- `307681d1` chore(deps): remove expired braces exception (advisory no longer reported)
- `17d707ec` chore: sync SDLC templates from DevAudit 1.14.0

### Co-Tracked Bundle Members

Declared co-primary at Phase 1 planning time (devaudit-installer#736) — not absorbed predecessors, each keeps fully isolated per-REQ evidence:

- `REQ-122` (co-tracked/bundled) — Staff notifications, alert numbers and escalation (WA-12)
