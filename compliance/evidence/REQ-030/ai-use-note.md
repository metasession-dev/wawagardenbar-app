# REQ-030 — AI Use Note

**Risk:** HIGH (MEDIUM baseline → MEDIUM + AI-involvement +1)

Per the AI Use Policy / Review Policy (Risk-Tiered) in `INSTRUCTIONS.md`:

- All planning docs, tests, implementation, and evidence in this REQ are AI-generated
  (Claude Code — claude-opus-4-7[1m]).
- Human reviewer of AI code: **ostendo-io** (pending — PR-time review).
- Because baseline risk is MEDIUM and this feature touches the order-creation / inventory
  path, the AI-involvement bump pushes this to **HIGH**, which per policy requires a
  **second human reviewer** before merge to `main`.
- No auto-generated components are regenerated blindly; every file change is a targeted
  edit with accompanying unit tests.

**Prompt transcript:** `compliance/evidence/REQ-030/ai-prompts.md` (compiled at Stage 3).
