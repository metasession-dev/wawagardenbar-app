# AI Prompt Log — REQ-029

Chronological log of AI interactions that drove plan or code. HIGH-risk REQ requires this log per SDLC.

## Session 1 — 2026-04-18

**Developer prompt (verbatim):**

> i just approved a expense with this transaction reference and completed the transfer but cant find it in the expenses TRF|2MPTfr482|2045529935434317824

**AI action:** Investigated expense / pending-expense-group flow. Identified root cause: server search uses `$text` on a text index covering only `description` + `notes`, and client filter covers only `description` + `category` + `supplier`. `receiptReference` is not searchable. Pipe character in TRF reference also breaks `$text` tokenisation even if the field were indexed.

**Developer prompt:**

> create an issue and include other search parameters

**AI action:** Created GitHub issue #64 proposing search-field expansion.

**Developer prompt:**

> implement https://github.com/metasession-dev/wawagardenbar-app/issues/64

**AI action:** Presented implementation plan summary for confirmation (WAIT CHECKPOINT 1). Developer confirmed.

**AI action:** Wrote `implementation-plan.md` (includes D1–D5 architecture decisions, most notably D1 — switch from `$text` to regex `$or`). Presented for confirmation. Developer confirmed.

**AI action:** Wrote `test-scope.md` (9 acceptance criteria). Presented for confirmation (WAIT CHECKPOINT 2). Developer confirmed.

**AI action:** Wrote `test-plan.md`. Refined design to extract pure helpers into `lib/expense-search.ts` so single-source field list and numeric-match rule drive both server regex build and client predicate. Presented for confirmation (WAIT CHECKPOINT 3). Developer confirmed.

**Next:** Commit plan, write Phase 1 unit tests (TDD).
