# `chore: devaudit update to 0.1.28` — review note

**Sync PR:** [#219](https://github.com/metasession-dev/wawagardenbar-app/pull/219)
**Branch:** `chore/devaudit-update-to-0.1.28`
**Sync branch base:** `486e0782` (the close-out commit for REQ-053)
**Reviewed:** 2026-06-01

## TL;DR — recommend MERGE AS-IS

The sync is **purely additive + adopts the two upstream issues filed during REQ-053** ([DevAudit-Installer #92](https://github.com/metasession-dev/DevAudit-Installer/issues/92) and [#93](https://github.com/metasession-dev/DevAudit-Installer/issues/93)) which replace local script patches with equivalent or better upstream versions.

The `docs/whatsapp-templates.md` PR #217 merged after the sync branch was cut, but **there's no conflict** — git's merge-base computation will keep the doc on develop. The `-462` line stat is a visual artifact, not a deletion.

## File-by-file

| File                                                                             | Sync delta                                                                                                                                                                                                                          | Risk                        | Action                                                                                                                       |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `scripts/derive-release-version.sh`                                              | Adds upstream pending-ticket fallback (#92 Layer 1) — **same logic** as local patch `d49fea6` but with NUL-delimited counting + more robust `basename` extraction.                                                                  | None — strict upgrade       | Merge replaces local patch; the comment in the local patch about the temporary nature is now misleading (see cleanup below). |
| `scripts/validate-commits.sh`                                                    | Widens `CC_REGEX` to `(\([^)]+\))?` (#93) — **byte-identical** to local patch `f8b3b29`.                                                                                                                                            | None                        | Merge replaces local patch cleanly.                                                                                          |
| `.claude/skills/e2e-test-engineer/SKILL.md`                                      | +4 substantive additions: focused-iteration loop (Phase 6.1), `error-context.md` first-pass triage (Phase 6.0), dual artefact-shape upload note (Phase 1b.10), `failed`/`timedOut`/`interrupted` filter for JSON-reporter analysis. | None — direct upgrade       | Accept. Future regression-suite triage inherits the patterns the session burned through.                                     |
| `.claude/skills/e2e-test-engineer/references/common-patterns.md` (NEW)           | Appendix of framework × component-library locator gotchas: shadcn `CardTitle` is a `<div>` (not a heading); Radix `<Select>` renders two `role="combobox"` nodes; Next.js `<Link>` clicks don't fire network events.                | None                        | Accept. Institutional memory from PR #211's 4-cycle triage captured upstream.                                                |
| `.claude/skills/sdlc-implementer/SKILL.md`                                       | Adds Phase 0 worked-examples block so the orchestrator stops mis-routing `test:` and `ci:` housekeeping down tracked-path machinery.                                                                                                | None                        | Accept.                                                                                                                      |
| `docs/whatsapp-templates.md`                                                     | Stat shows `-462` because the sync branch base (`486e0782`) predates PR #217. **NOT** a deletion — git's 3-way merge keeps develop's version.                                                                                       | None — visual artifact only | Verify post-merge: `git log -1 docs/whatsapp-templates.md` should still show PR #217's commit.                               |
| `ci.yml`, `compliance-*.yml`, `sdlc-config.json`, `INSTRUCTIONS.md`, `CLAUDE.md` | No change.                                                                                                                                                                                                                          | None                        | n/a — confirms the sync is contained to scripts + skills.                                                                    |

## What this sync gives us

1. **Releases self-heal from the phantom-attribution bug.** No more `gh workflow run --ref develop` dance when a `chore:` commit lands on develop between feature merge and release PR. The pending-ticket fallback resolves the REQ correctly even at HEAD-without-a-tag.
2. **Multi-scope commit subjects accepted natively** (`feat(a,b):`, `refactor(tab,order):`). Removes the friction REQ-053 hit at Compliance Validation.
3. **`e2e-test-engineer` skill carries the regression-triage knowledge from this session** — focused-iteration loop, `error-context.md` first-pass, the shadcn/Radix/Next.js gotcha appendix. The next time the suite breaks, the diagnostic path is shorter.
4. **`sdlc-implementer` skill stops sending `test:` housekeeping through tracked-path ceremony** — the gap that surfaced when starting PRs #211 and #213.

## Pre-merge checklist (~30 seconds)

1. **Verify no `compliance/` changes in the sync diff** (none expected):

   ```bash
   git diff develop..origin/chore/devaudit-update-to-0.1.28 -- compliance/
   ```

   Empty = good.

2. **Verify `ci.yml` unchanged**:

   ```bash
   git diff develop..origin/chore/devaudit-update-to-0.1.28 -- .github/workflows/ci.yml
   ```

   Empty = good. If non-empty, the #92 phantom-attribution surface gets a closer look since `paths-ignore` is the other half of the bug.

3. **Confirm the whatsapp doc lives post-merge** (run after merge):

   ```bash
   git ls-tree HEAD docs/whatsapp-templates.md
   ```

   Non-empty = the file survived merging the sync branch back into develop.

## Merge recommendation

Normal merge — no admin override needed. No risk to in-flight work; no required-check failures expected.

```bash
gh pr merge 219 --merge --delete-branch
```

## Post-merge cleanup (optional, low priority)

The sync replaces two local patches with upstream equivalents. The local commits remain in develop's history with messages that reference the local-patch-vs-upstream split, which is now misleading:

- `d49fea6` (`ci: derive-release-version pending-ticket fallback [REQ-053]`) — the upstream version supersedes; comment says "filed upstream as DevAudit-Installer#92; remove local patch on next devaudit update" — that statement is now historical.
- `f8b3b29` (`ci: widen validate-commits.sh CC_REGEX to accept multi-scope subjects`) — same.

Optional follow-up: a `docs:` commit removing the "filed upstream as #92/#93; remove on next sync" notes from `compliance/approved-releases/RELEASE-TICKET-REQ-053.md` so the closed-out ticket reads cleanly. Single-line edits; not worth a dedicated PR unless it bundles with other docs work.

## Risks considered

- **What if the upstream pending-ticket fallback diverges from how it's actually used?** It scans `compliance/pending-releases/RELEASE-TICKET-REQ-*.md`. We already keep that directory pattern consistent across REQ-049 through REQ-053. Empty before a new tracked release starts → step falls through to bare date. One ticket open → attributes correctly. ≥2 tickets open → ambiguous, falls through. Safe.
- **What if the e2e-test-engineer skill change introduces new behaviour?** It's prescriptive content, not executable code — affects what the skill recommends during triage. Worst case: future invocations recommend a pattern that doesn't fit a one-off project nuance. Skill is invoked, not mandated.
- **What if the `compliance/notes/` directory pattern isn't picked up by future sync upload paths?** This file is operator-side review history, not an artefact the portal needs to ingest. `compliance-evidence.yml` doesn't scan `compliance/notes/`. No downstream surface to worry about.
