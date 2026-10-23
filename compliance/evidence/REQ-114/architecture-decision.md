---
req: REQ-114
generated_by: adr-author
generated_at: 2026-10-23T22:55:00Z
---

# Architecture decision — REQ-114

## Outcome

**No ADR needed — confirmed by the operator on 2026-10-23.** Security-forced version migration of two existing dependencies (`zod` 3 → 4, `@hookform/resolvers` 3 → 5). The app keeps the same validation architecture (zod schemas, `zodResolver` in react-hook-form forms, `parse`/`safeParse` in server actions).

## Detail

- **Rationale:** The advisory (GHSA-mrhx-c7xc-m3w5) forces the decision, and no design alternative changes the architecture: stay on zod and move to its patched major. Only call shapes change (`ZodError.errors` → `.issues`, `required_error`/`errorMap` → `error`, form input/output typing). Package versions, the plan and its Plan deviation section record the decision.
- **Signals examined:**
  - New third-party runtime dependency — none (both packages already present).
  - New external service — none.
  - New database / cache / queue tier — none.
  - Schema-level data model change — none.
  - Risk classification — MEDIUM (not HIGH/CRITICAL).
  - File-path signals (defaults `lib/services/`, `lib/repositories/`, `prisma/`, `infra/`) — none touched.
  - Dependency bump — **major with API changes** (edge: not the "no API change" case).
  - Pattern change spanning > 3 files — **edge.** The migration touches the 40 zod files: a mechanical API migration, plus one new convention, importing `z` from `@/lib/zod` (which carries zod-3-compatible default messages) instead of `'zod'`. The validation pattern itself is unchanged.
- **Why the verdict was flagged before confirmation:** two edge signals score borderline, and the operator asked for an ADR on REQ-113. If the operator wants one, the natural subject is the new convention: "all zod imports go through `@/lib/zod`, which pins zod-3 default messages". Next free ID: ADR-006 (ADR-005 is in use by REQ-113 on its branch).
- **Cross-references:** plan §3 and § Plan deviation items 1–2; risk register R-038, R-039; SRS trace-only (see `srs-alignment.md`).

## Operator sign-off

I have reviewed the ADR-worthiness verdict above and confirm:

- [ ] The verdict (ADR or no-ADR) matches the actual scope of this REQ.
- [ ] If ADR: the file at `docs/ADR/ADR-NNN-<slug>.md` is edited from stub to canonical prose and status is Accepted.
- [ ] If no-ADR: the rationale is specific enough that an auditor reading this in 12 months would agree.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
