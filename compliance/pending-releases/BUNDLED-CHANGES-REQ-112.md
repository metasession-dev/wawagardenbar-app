## Bundled Changes

- **Core tracked release:** `REQ-112`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-112.json`
- **Manifest hash:** `sha256:3101c5e46539191afd32cd36f9d7535eac33a51c5d3f4a53da658b6245b93faf`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-111
- **Absorbed non-release work:** housekeeping commits since `51e0f8390b51ad252cbbe0138e268e42139c31d8`
- **Why bundled here:** Explicit predecessor release tickets and non-release work are consolidated under approval envelope `REQ-112`.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes the core tracked release plus the explicit predecessor releases and non-release work listed below.
- **Security / risk impact:** No additional security/risk impact identified automatically; reviewer must confirm in the canonical release artifacts.
- **Reference:** commit range `51e0f8390b51ad252cbbe0138e268e42139c31d8..HEAD`

### Explicit Constituent Releases

- None

### Absorbed Non-Release Work

- `f203f10` chore: bump transitive vite to 8.3.4 via overrides (GHSA-587h-7wmj-h5pm)
- `8224770` chore: sync SDLC templates from DevAudit (1.8.0 -> 1.9.0)
- `25f51f3` chore(compliance): export incident #923
- `1775c27` chore(compliance): export incident #922
- `44b3509` chore(compliance): export incident #921
- `639c4de` chore(compliance): export incident #920
- `d291426` ci: fix STATUS-capture bug in E2E Regression Tests step (925 follow-up)
- `123fe4f` ci: restore sharded full-regression run dropped by devaudit sync 7a7f3e4; fix dev-server reaping bug

### Co-Tracked Bundle Members

Declared co-primary at Phase 1 planning time (devaudit-installer#736) — not absorbed predecessors, each keeps fully isolated per-REQ evidence:

- `REQ-111` (co-tracked/bundled) — Account-recovery routing for inbound WhatsApp messages
