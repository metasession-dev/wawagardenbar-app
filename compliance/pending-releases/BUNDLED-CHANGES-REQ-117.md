## Bundled Changes

- **Core tracked release:** `REQ-117`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-117.json`
- **Manifest hash:** `sha256:92ab82dbce45db5e73b19822f3b262b8603036820788f5935090afe257f898cf`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-118
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** Explicit predecessor release tickets and non-release work are consolidated under approval envelope `REQ-117`.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes the core tracked release plus the explicit predecessor releases and non-release work listed below.
- **Security / risk impact:** No additional security/risk impact identified automatically; reviewer must confirm in the canonical release artifacts.
- **Reference:** commit range `origin/main..HEAD`

### Explicit Constituent Releases

- None

### Absorbed Non-Release Work

- `3ee0802` chore: sync SDLC templates from DevAudit 1.12.0
- `3793f0f` ci: stop the sharded regression re-running the aggregate chain and widen the shard budget
- `71b0af2` docs(compliance): add REQ-116 accepted E2E failure record

### Co-Tracked Bundle Members

Declared co-primary at Phase 1 planning time (devaudit-installer#736) — not absorbed predecessors, each keeps fully isolated per-REQ evidence:

- `REQ-118` (co-tracked/bundled) — Threaded WhatsApp support with window-aware replies (WA-10)
