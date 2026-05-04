# Note for the next agent: SDLC sync commit on develop

A sync commit is sitting at the top of `develop` (commit `a2d4551`), one
commit ahead of the REQ-031 Stage 1 TDD commit (`0189e99`).

## What it is

`chore: sync SDLC templates sdlc-v1.17.5 from META-COMPLY` — picks up the
"Status Reporting (MANDATORY before handing off)" section in
`INSTRUCTIONS.md` and the matching update to `SDLC/4-submit-for-review.md`.

The change comes from META-COMPLY PR #151 (merged to main) and was applied
here via `scripts/sync-sdlc.sh v1.17.5`.

## Why it isn't pushed yet

The pre-push TypeScript check fails on the REQ-031 TDD tests
(`__tests__/lib/cart-line-math.test.ts`) because they import
`@/lib/cart-line-math` and `@/lib/customization-validation`, which don't
exist yet — by design, this is the red phase of TDD.

The block is on the REQ-031 work, not on the sync commit. The sync commit
itself only changes two markdown files.

## What you need to do

Nothing special. When you finish REQ-031 implementation and the pre-push
TS check goes green, your `git push origin develop` will send `a2d4551`
along with your work in the same push.

**Do NOT:**

- `git rebase` in a way that reorders or drops `a2d4551`.
- `git reset --hard` past `a2d4551`.
- `git push --no-verify` to bypass the TS error — fix the underlying
  TS/module issue instead (that's the whole point of the new Status
  Reporting rule the sync commit ships).

If you need to verify the sync content before pushing:
`git show a2d4551` — should be ~37 line additions across `INSTRUCTIONS.md`
and `SDLC/4-submit-for-review.md` only.

## After your push

Delete this note file: it lives in `compliance/drafts/` and is untracked.
