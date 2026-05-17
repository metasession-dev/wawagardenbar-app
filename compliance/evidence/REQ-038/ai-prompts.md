# AI Prompt Log — REQ-038

**Issue:** [#84](https://github.com/metasession-dev/wawagardenbar-app/issues/84)
**AI Tool:** Claude Code (Claude Opus 4.7, 1M context)
**Date range:** 2026-05-15 — TBD

## Scoping phase (2026-05-15)

| #   | Operator prompt                                                                                                                                                                           | AI action                                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | "create another issue, we want to be able to be able to 'restock sellable items from expense'..."                                                                                         | Drafted initial issue body using the kitchen-link path as the model                                                                                                                   |
| 2   | "is there a better way to map 'Is Bottles' toggle so we can bind the menu item to the correct unit in the expense for multiple different types of menu items which may not be bottles..." | Acknowledged the initial Bottles-toggle design was punt-shaped; redesigned as a single Purchase unit dropdown sourced from the UoM registry, with "Any" as default; updated issue #84 |

## Bundled-release phase (2026-05-17)

| #   | Operator prompt                                                                   | AI action                                                                                                                                                                             |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3   | "implement 84 and 88 and the D12 followup all together as one release" → "Pick A" | Acknowledged bundled-release pattern; merged SDLC v1.25.0 sync; filed REQ-040; created REQ-038 evidence skeleton (7 markdown files + this prompt log) + release ticket; added RTM row |

## Implementation phase

(To be appended as each commit lands; cite the prompt + the resulting file changes per commit. Compile before merge per `[[feedback_sdlc_impl_plan_review]]` MEDIUM-risk policy: 1 reviewer.)
