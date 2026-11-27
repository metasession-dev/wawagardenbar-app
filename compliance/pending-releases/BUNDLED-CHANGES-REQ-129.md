## Bundled Changes

- **Core tracked release:** `REQ-129`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-129.json`
- **Manifest hash:** `sha256:795686c792a36c3f67315eb10811090060dca203c54c6739188e60c3bd997823`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-130
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** Explicit predecessor release tickets and non-release work are consolidated under approval envelope `REQ-129`.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes the core tracked release plus the explicit predecessor releases and non-release work listed below.
- **Security / risk impact:** No additional security/risk impact identified automatically; reviewer must confirm in the canonical release artifacts.
- **Reference:** commit range `origin/main..HEAD`

### Explicit Constituent Releases

- None

### Absorbed Non-Release Work

- `f41a6213` docs: note that Paystack keys are database settings, not env vars

### Co-Tracked Bundle Members

Declared co-primary at Phase 1 planning time (devaudit-installer#736) — not absorbed predecessors, each keeps fully isolated per-REQ evidence:

- `REQ-130` (co-tracked/bundled) — Dashboard: Support link in the main menu (#1087)
