# REQ-057 — IG cadence defaults + Instagram handle validation

**Requirement ID:** REQ-057
**Risk Level:** LOW
**GitHub Issue:** [#117 IG-1 + IG-2](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-01

## Context

#117's Instagram-engagement bundle has 8 items (IG-1 through IG-8). The first two are foundation work the rest of the bundle depends on:

- **IG-1** — extend `RewardRule.socialConfig` with cadence fields (`postsRequired`, `windowDays`, `pointsAwarded`, `requireMention`, `requireHashtag`, `campaignStart`, `campaignEnd`).
- **IG-2** — customer Instagram handle capture in profile with format validation.

A pre-REQ-057 survey found that **most of the surface is already implemented**:

- `ISocialRewardConfig` already has `postsRequired`, `windowDays`, `pointsAwarded`, `requireMention`, `hashtag`. (`hashtag` covers the IG-1 `requireHashtag` intent; renaming would force a Mongoose migration with no value.)
- Top-level `IRewardRule.startDate`/`endDate` plus `campaignDates[]` array already covers the IG-1 `campaignStart`/`campaignEnd` intent.
- Instagram handle input + `@`-prefix adornment already exist at `components/features/profile/personal-info-tab.tsx:147-168` with a zod `max(30)` validator.
- Leading-`@` strip already exists at the action layer (`app/actions/profile/profile-actions.ts:147-149`).

So REQ-057 is a tight LOW-risk polish: add the missing defaults, paired-validity guard for cadence fields, format-regex on the handle, and consolidate the leading-`@` normalisation into the zod schema so client + server share one source of truth. ~50 LOC of production code plus the test pack.

## Acceptance criteria

1. **AC1 — `ISocialRewardConfig` cadence defaults** — `models/reward-rule-model.ts`'s `socialConfig` subdoc sets `postsRequired: { default: 3 }` and `windowDays: { default: 7 }` on top of the existing `min: 1` validators. New rules created without explicit cadence get sane defaults; existing rules in Mongo are unaffected (Mongoose default-on-read doesn't write to disk).

2. **AC2 — Paired-field validity** — Mongoose pre-validate hook on `RewardRule`: when `socialConfig` is present, either both `postsRequired` AND `windowDays` are present, or neither is. Half-configured cadence (one without the other) fails validation with `'socialConfig.postsRequired and windowDays must be set together'`. Allows the legacy per-post / capped-period model (neither cadence field set) AND the new cadence model (both set) but blocks the degenerate half-state.

3. **AC3 — Instagram handle format regex** — zod schema in `app/actions/profile/profile-actions.ts` and the matching client-side schema in `components/features/profile/personal-info-tab.tsx` tighten `instagramHandle` from `.string().max(30)` to a `.transform()` + `.refine()` pipe:
   - `.transform(v => v?.replace(/^@/, '').trim() ?? v)` — strips leading `@` and trims whitespace post-paste.
   - `.refine(v => !v || /^[a-zA-Z0-9._]{1,30}$/.test(v), 'Only letters, numbers, periods, and underscores; max 30 chars')` — Instagram's actual handle character set.
   - Empty string `''` still accepted as a "clear handle" sentinel via the existing `.or(z.literal(''))`.

4. **AC4 — Remove now-redundant manual strip** — `app/actions/profile/profile-actions.ts:147-149`'s `startsWith('@')` strip + the `lastCheckedAt: new Date()` reset block is now done by the zod transform; the action's manual `cleanHandle` step is removed. The transform applies on both client (via react-hook-form's zod resolver) and server (via `updateProfileSchema.parse`), so the strip happens in one place.

5. **AC5 — Explainer copy ties to IG campaigns** — `components/features/profile/personal-info-tab.tsx:166`'s helper text changes from `"Add your Instagram handle to participate in social rewards!"` to `"Required to earn points on Instagram tagging campaigns — we use this to match your tags to your account."` — matches the IG-2 spec language and sets expectations for the upcoming campaign UI (IG-6/IG-7).

6. **AC6 — Tests** — new unit cases (TDD red-first):
   - Schema: defaults applied when cadence fields omitted; paired-validity hook rejects half-set cadence; both-set passes; neither-set passes (legacy mode).
   - Zod schema: regex accepts `foo`, `foo.bar`, `foo_bar`, `foo.123`, `123foo`; rejects `foo bar`, `foo-bar`, `foo!`, `foo@bar`, `<script>`; empty string accepted; leading `@` stripped to bare handle.
   - Whitespace: `'  foo  '` trimmed to `foo`.

## Technical approach

### 1. `models/reward-rule-model.ts` (~10 LOC change)

```diff
 socialConfig: {
   platform: { type: String, enum: ['instagram'] },
   hashtag: { type: String },
   minViews: { type: Number },
   maxPostsPerPeriod: { type: Number },
   periodType: { type: String, enum: ['weekly', 'monthly', 'campaign_duration'] },
   pointsAwarded: { type: Number },
-  postsRequired: { type: Number, min: 1 },
-  windowDays: { type: Number, min: 1 },
+  postsRequired: { type: Number, min: 1, default: 3 },
+  windowDays: { type: Number, min: 1, default: 7 },
   requireMention: { type: Boolean, default: true },
 },
```

Plus a pre-validate hook below the schema declaration:

```ts
rewardRuleSchema.pre('validate', function paired() {
  const sc = this.socialConfig;
  if (!sc) return;
  const hasPosts = sc.postsRequired !== undefined && sc.postsRequired !== null;
  const hasWindow = sc.windowDays !== undefined && sc.windowDays !== null;
  if (hasPosts !== hasWindow) {
    this.invalidate(
      'socialConfig',
      'socialConfig.postsRequired and windowDays must be set together'
    );
  }
});
```

Caveat: with the defaults applied (AC1), the "neither-set" state is harder to reach via `RewardRule.create({ socialConfig: { platform: 'instagram' } })` because Mongoose auto-fills the defaults. The pre-validate hook still matters for explicit-null assignment paths (admin form clearing the field) and for documents pre-dating the defaults. The hook fires in both create + update validation.

### 2. `interfaces/reward.interface.ts` (~4 LOC change)

```diff
-  postsRequired?: number;
-  windowDays?: number;
+  /** Default 3 when socialConfig is present. Paired with windowDays. */
+  postsRequired?: number;
+  /** Default 7 days when socialConfig is present. Paired with postsRequired. */
+  windowDays?: number;
```

JSDoc nudge only; runtime defaults live in the Mongoose schema.

### 3. `app/actions/profile/profile-actions.ts` (~10 LOC change)

```diff
-  instagramHandle: z.string().max(30).optional().or(z.literal('')),
+  instagramHandle: z
+    .string()
+    .max(30)
+    .transform(v => v.replace(/^@/, '').trim())
+    .refine(
+      v => v === '' || /^[a-zA-Z0-9._]{1,30}$/.test(v),
+      { message: 'Only letters, numbers, periods, and underscores; max 30 chars' }
+    )
+    .optional()
+    .or(z.literal('')),
```

And remove the manual strip + redundant block:

```diff
   if (validated.instagramHandle !== undefined) {
-    const handle = validated.instagramHandle.trim();
-    if (handle) {
-      const cleanHandle = handle.startsWith('@') ? handle.substring(1) : handle;
+    const cleanHandle = validated.instagramHandle;
+    if (cleanHandle) {
       updateData.socialProfiles = {
         instagram: {
           handle: cleanHandle,
           lastCheckedAt: new Date(),
           verified: false,
         },
       };
     }
   }
```

### 4. `components/features/profile/personal-info-tab.tsx` (~6 LOC change)

```diff
-  instagramHandle: z.string().max(30, 'Handle is too long').optional().or(z.literal('')),
+  instagramHandle: z
+    .string()
+    .max(30, 'Handle is too long')
+    .transform(v => v.replace(/^@/, '').trim())
+    .refine(
+      v => v === '' || /^[a-zA-Z0-9._]{1,30}$/.test(v),
+      { message: 'Only letters, numbers, periods, and underscores; max 30 chars' }
+    )
+    .optional()
+    .or(z.literal('')),
```

Plus the explainer text update:

```diff
   <p className="text-xs text-muted-foreground">
-    Add your Instagram handle to participate in social rewards!
+    Required to earn points on Instagram tagging campaigns — we use this to match your tags to your account.
   </p>
```

### 5. No env vars, no new packages, no DB migration

The schema defaults apply on next-write of new rules; existing rules unchanged. The handle-format regex is permissive enough to accept every Instagram-valid handle already on disk. No backfill required.

## Tests (TDD — written before implementation)

### `__tests__/services/reward-rule-cadence-schema.test.ts` (extend existing file, +6 cases)

Existing file already covers field presence + types + min validators. Add:

- AC1 — `postsRequired` defaults to 3 when omitted in `socialConfig`.
- AC1 — `windowDays` defaults to 7 when omitted in `socialConfig`.
- AC1 — explicit cadence values override the defaults.
- AC2 — half-set cadence (only `postsRequired`) fails validation with the documented message.
- AC2 — half-set cadence (only `windowDays`) fails validation.
- AC2 — both-set cadence + neither-set cadence both pass validation.

### `__tests__/actions/profile-actions.instagram-handle.test.ts` (new, ~10 cases)

- AC3 — `foo` accepted.
- AC3 — `foo.bar` / `foo_bar` / `foo.123` / `123foo` accepted.
- AC3 — empty string accepted.
- AC3 — `foo bar` (space) rejected with the documented message.
- AC3 — `foo-bar` (hyphen) rejected.
- AC3 — `foo!` (special char) rejected.
- AC3 — 31-char handle rejected.
- AC3 — `<script>alert(1)</script>` rejected.
- AC4 — `@foo` transformed to `foo` (leading-`@` strip).
- AC4 — `  foo  ` (surrounding whitespace) trimmed to `foo`.

## Dependencies

- **REQ-053** — `ISocialRewardConfig` cadence fields shape (Mongoose defaults pattern reused) ✅
- **Existing** `ISocialRewardConfig` cadence fields (added pre-session) — REQ-057 finishes the job
- No new packages, no env vars, no DB migration

## Security considerations

### STRIDE

| Cat   | Risk introduced? | Rationale / mitigation                                                                                                                                                                                                               |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **S** | No               | Profile updates go through the existing session-gated action; no new auth surface                                                                                                                                                    |
| **T** | Low              | Tighter regex on Instagram handle blocks XSS / NoSQL injection attempts that the previous `.max(30)` allowed (e.g. `<script>` would have written verbatim). New regex `^[a-zA-Z0-9._]{1,30}$` admits only Instagram-valid characters |
| **R** | No               | Existing audit log on `user.update` action keeps capturing `fields` updated; no change                                                                                                                                               |
| **I** | No               | No new data persisted; handle was already saved (now just validated)                                                                                                                                                                 |
| **D** | No               | Pre-validate hook is constant-time on each rule write; reads a small subdoc                                                                                                                                                          |
| **E** | No               | No role / permission change                                                                                                                                                                                                          |

### Privacy / regulatory

- No new PII collected. Instagram handle was already collected via the existing profile form.
- The handle is a public identifier (Instagram usernames are public by design); regex doesn't change exposure.

### Four-eyes attestation

- **Submitter**: Claude Code (AI tool) via project orchestrator.
- **Reviewer**: ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Rollback plan

1. Single PR. `git revert <merge-sha>` removes the schema defaults, the pre-validate hook, the regex refinements, and restores the previous explainer copy. The Mongoose collection persists unchanged; documents written between merge and revert that relied on the defaults retain whatever values were stamped at write time.
2. No DB migration to roll back.
3. Detection: customers can again submit `<script>` or other invalid characters as IG handles. Trivially recovered by re-applying the regex in a follow-up; persistence of invalid handles between revert + re-apply is bounded.

## Test scope

| Gate                            | Expected                                                             |
| ------------------------------- | -------------------------------------------------------------------- |
| `npx tsc --noEmit`              | exit 0                                                               |
| `npx vitest run`                | 0 failures; +16 new cases (6 schema + 10 zod)                        |
| `npx eslint <changed>`          | 0 errors                                                             |
| `semgrep scan --severity=ERROR` | 0 new findings                                                       |
| `npm audit --audit-level=high`  | 0 high/critical                                                      |
| E2E focused                     | n/a — schema + form validation; per `project_e2e_targeted_until_117` |

## Plan deviation log

(populated during implementation if anything diverges from the above)
