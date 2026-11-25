## Bundled Changes

- **Core tracked release:** `REQ-125`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-125.json`
- **Manifest hash:** `sha256:5b56d343ab944e25849875e152a945cbef8ededfe182ec902ca6426eeec03a05`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-126 REQ-127
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** Explicit predecessor release tickets and non-release work are consolidated under approval envelope `REQ-125`.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes the core tracked release plus the explicit predecessor releases and non-release work listed below.
- **Security / risk impact:** No additional security/risk impact identified automatically; reviewer must confirm in the canonical release artifacts.
- **Reference:** commit range `origin/main..HEAD`

### Explicit Constituent Releases

- None

### Absorbed Non-Release Work

- `8ff64c51` chore: enable reuse_pull_request_gates (DevAudit-Installer#1298)
- `dbaeeff6` chore: sync SDLC templates from DevAudit 1.14.0 -> 1.15.0

### Co-Tracked Bundle Members

Declared co-primary at Phase 1 planning time (devaudit-installer#736) — not absorbed predecessors, each keeps fully isolated per-REQ evidence:

- `REQ-126` (co-tracked/bundled) — WhatsApp "order" gets the menu link; status enquiries raise an urgent ticket (WA-16)
- `REQ-127` (co-tracked/bundled) — Checkout: failed payment start keeps one Pending order (#1031)
