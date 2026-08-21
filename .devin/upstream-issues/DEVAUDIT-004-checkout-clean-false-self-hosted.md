# DEVAUDIT-004: `actions/checkout` default `clean: true` defeats self-hosted npm cache

**Status:** Filed — [DevAudit-Installer#676](https://github.com/metasession-dev/DevAudit-Installer/issues/676)
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
(`ostendo-server`, since #666), this optimization **never fired**. Root
cause: every generated workflow that can run on the self-hosted runner does
its own `actions/checkout@v6` without `clean: false`, so it defaults to
`clean: true` — which runs `git clean -ffdx` before checkout, removing all
untracked/gitignored files in the workspace, including `node_modules`
(gitignored) and the `.lock-hash` marker inside it.

**This isn't confined to `ci.yml`'s own `quality-gates` job.** All the
generated workflows that resolve to the same `CI_RUNNER_LABEL` share **one
physical workspace directory** on the runner (`_work/<repo>/<repo>`, fixed
per repo, not per workflow or job). With only one runner registered, jobs run
one at a time, but they still take turns in the *same* directory. On this
repo, `feature-e2e.yml`'s `detect-req` job runs on every PR to `develop`
(triggered independent of `ci.yml`) and does its own default-clean checkout
into that same shared directory — so even after patching `ci.yml`'s
`quality-gates` checkout alone, `node_modules` was still being wiped between
runs by a *different* workflow's checkout step. Confirmed by observation: a
first fix limited to `ci.yml`'s `quality-gates` job still showed `npm ci`
running in full (not skipping) on a second consecutive PR run with an
unchanged lockfile, because `feature-e2e.yml`'s checkout ran in between and
cleaned the shared directory.

Every run therefore starts from a wiped workspace, the hash check always
misses, and `npm ci` pays its full cost (~30-47s for this repo's 886
packages) on every single run — exactly the cost the self-hosted cutover was
supposed to let it skip.

## Proposed fix

Add `clean: false` to **every** `actions/checkout` step's `with:` block
across every generated workflow, wherever the resolved runner is self-hosted
(i.e. wherever the template already branches on `resolveRunner()` for the
`runs-on:` expression) — not just `ci.yml`. On `wawagardenbar-app` this
covers 12 checkout call sites across 9 files: `ci.yml` (3), `feature-e2e.yml`
(2), `check-release-approval.yml`, `close-out-completion.yml`,
`close-out-release.yml`, `compliance-evidence.yml` (2),
`compliance-validation.yml`, `post-deploy-prod.yml`,
`reconcile-deployment.yml`. Workflows that are hardcoded to `ubuntu-latest`
regardless of `CI_RUNNER_LABEL` (`e2e-regression.yml`,
`incident-export.yml`, `label-retention.yml`, `periodic-review.yml`,
`quality-gates-provenance.yml` on this repo) don't need the change — they
never share the self-hosted workspace.

`npm ci` itself always does a correct clean install when the lockfile hash
*has* changed, so this doesn't risk installing stale dependencies — it only
lets the skip-path actually skip on repeat runs with an unchanged lockfile,
regardless of which workflow's checkout ran most recently on the shared box.

For GitHub-hosted (`ubuntu-latest`) runs, `clean` should stay at its default
(`true`) — there's no persistent workspace to preserve, and it costs nothing
to leave that path untouched.

## Acceptance criteria

1. Every generated workflow's checkout step(s) that resolve to a self-hosted
   `runs-on:` set `clean: false` (mirroring the existing self-hosted branch
   used for `runs-on:`), not just `ci.yml`'s.
2. `devaudit update` on an existing self-hosted consumer regenerates all
   affected workflow files with the new checkout config without requiring a
   `runner` field change.
3. Document the cache-persistence assumption — and that it's a *shared
   workspace across all self-hosted workflows for the repo*, not per-job — in
   `docs/articles/sdlc-config-ci-persistence-long-form.md` or equivalent.
4. Document the corollary: a periodic cache-wipe job is recommended for
   self-hosted consumers, since a corrupted `node_modules` now persists
   across every workflow that touches this repo on this runner, not just one
   job.

## Interim state

`wawagardenbar-app` has `clean: false` added directly to all 12 self-hosted
checkout call sites as a stopgap (PR #668). Per each file's own header
warning, this will be silently reverted by the next `devaudit update` unless
this fix lands upstream first — tracked here so that regression is expected,
not a surprise.

---

_Documented by: Claude Sonnet 5 (Claude Code)_
_Date: 2026-08-21_
_Context: CI speed/efficiency review requested after issue #666 (self-hosted
runner cutover)_
