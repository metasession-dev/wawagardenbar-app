# DEVAUDIT-004: `actions/checkout` default `clean: true` defeats self-hosted npm cache

**Status:** Draft - Ready for upstream submission
**Target Repository:** `metasession-dev/DevAudit-Installer`
**Priority:** Medium
**Related:** issue #666 (self-hosted runner cutover), `ci.yml`'s "Install dependencies (skip if lockfile unchanged)" step

---

## Problem statement

The generated `ci.yml`'s "Install dependencies" step is designed to skip
`npm ci` when `package-lock.json`'s hash matches a marker file
(`node_modules/.lock-hash`) left by the previous run — an optimization that
only pays off on a persistent (self-hosted) runner, since GitHub-hosted
runners are ephemeral and never have a previous `node_modules` to find
anyway.

On `wawagardenbar-app`, now running on a persistent self-hosted runner
(`ostendo-server`, since #666), this optimization **never fires**. Root cause:
the `actions/checkout@v6` step in `ci.yml` doesn't set `clean: false`, so it
defaults to `clean: true` — which runs `git clean -ffdx` before checkout,
removing all untracked/gitignored files in the workspace, including
`node_modules` (gitignored) and the `.lock-hash` marker inside it. Every run
starts from a wiped workspace, so the hash check always misses and `npm ci`
pays its full cost (~47s for this repo's 886 packages) on every single run —
exactly the cost the self-hosted cutover was supposed to let it skip.

## Proposed fix

Add `clean: false` to the `actions/checkout` step's `with:` block in the
`ci.yml.template` whenever the resolved runner is self-hosted (i.e. wherever
the template already branches on `resolveRunner()` for the `runs-on:`
expression). `npm ci` itself always does a correct clean install when the
lockfile hash *has* changed, so this doesn't risk installing stale
dependencies — it only lets the skip-path actually skip on repeat runs with
an unchanged lockfile.

For GitHub-hosted (`ubuntu-latest`) runs, `clean` should stay at its default
(`true`) or be explicitly `true` — there's no persistent workspace to
preserve, and forcing `clean: false` there would just risk carrying over
stray state between unrelated ephemeral VMs is a non-issue but adds no
benefit either.

## Acceptance criteria

1. `ci.yml.template` sets `clean: false` on the checkout step only when the
   resolved runner is self-hosted (mirroring the existing self-hosted branch
   used for `runs-on:`).
2. `devaudit update` on an existing self-hosted consumer regenerates `ci.yml`
   with the new checkout config without requiring a `runner` field change.
3. Document the cache-persistence assumption (and its corollary — a periodic
   cache-wipe job is recommended for self-hosted consumers) in
   `docs/articles/sdlc-config-ci-persistence-long-form.md` or equivalent.

## Interim state

`wawagardenbar-app`'s `ci.yml` has `clean: false` added directly on the
checkout step as a stopgap (commit in the `ci/…` housekeeping PR that
accompanies this doc). Per the file's own header warning, this will be
silently reverted by the next `devaudit update` unless this fix lands
upstream first — tracked here so that regression is expected, not a
surprise.

---

_Documented by: Claude Sonnet 5 (Claude Code)_
_Date: 2026-08-21_
_Context: CI speed/efficiency review requested after issue #666 (self-hosted
runner cutover)_
