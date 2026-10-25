## Bundled Changes

- **Core tracked release:** `REQ-113`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-113.json`
- **Manifest hash:** `sha256:2960d76a28856529e4ff11dafa3aefa421870d39b4c4bccc5b01fa1edd93fd02`
- **Absorbed predecessor releases:** REQ-114
- **Absorbed non-release work:** housekeeping commits since `origin/main`
- **Why bundled here:** Explicit predecessor release tickets and non-release work are consolidated under approval envelope `REQ-113`.
- **Evidence impact:** Evidence ownership remains on the source releases; the bundle manifest provides lineage and inherited visibility only.
- **Reviewer impact:** Approval scope includes the core tracked release plus the explicit predecessor releases and non-release work listed below.
- **Security / risk impact:** No additional security/risk impact identified automatically; reviewer must confirm in the canonical release artifacts.
- **Reference:** commit range `origin/main..HEAD`

### Explicit Constituent Releases

- `REQ-114` (predecessor/superseded) — �� Upgrade zod 3 → 4 to clear GHSA-mrhx-c7xc-m3w5

### Absorbed Non-Release Work

- `ff2171b` chore: sync SDLC templates from DevAudit
- `208f3da` chore(deps): bump next to 16.4.2 and dompurify to 3.4.17 (audit gate)
- `4ee226e` chore: ignore playwright-report-shard-\* artifacts
- `055ddb4` docs(compliance): close out REQ-112 (+ REQ-111) — sync main + reconcile (RELEASED)
