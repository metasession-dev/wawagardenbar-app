# UAT execution record — REQ-119 Multiple roles per staff account

Complete this form while you test. It is the evidence of the UAT (ISO/IEC/IEEE 29119-3: test execution log, test incident report, test completion report). Do not write passwords here. If you copy it to the portal, keep this layout.

Status of this form: **BLANK. NOT YET EXECUTED.**

## A. Setup (operator and tester)

| Item                                                          | Value                                         |
| ------------------------------------------------------------- | --------------------------------------------- |
| Release / issue / PR                                          | REQ-119 / #965 / #1012                        |
| UAT website                                                   | https://wawagardenbar-app-uat.up.railway.app/ |
| Build SHA under test                                          |                                               |
| UAT deployed on (date, time, timezone)                        |                                               |
| Operator who prepared the release (name)                      |                                               |
| Tester (name)                                                 |                                               |
| Tester is a different person from the operator? (must be Yes) |                                               |
| Tester's role / organisation                                  |                                               |
| Browser and version, operating system                         |                                               |
| UAT start (date, time)                                        |                                               |

Operator checklist (initial each):

| #   | Item                                                                                                   | Done (initials, date) |
| --- | ------------------------------------------------------------------------------------------------------ | --------------------- |
| 1   | Release deployed to UAT, SHA recorded above                                                            |                       |
| 2   | Migration dry run run and output kept (file name: )                                                    |                       |
| 3   | Migration run with `--apply` and output kept (file name: )                                             |                       |
| 4   | Accounts created: uat-super, uat-admin, uat-csr, uat-csr-kitchen, uat-kitchen, uat-manager, uat-target |                       |
| 5   | Test order placed (order number: )                                                                     |                       |
| 6   | Test customer available                                                                                |                       |
| 7   | Passwords handed over privately                                                                        |                       |
| 8   | Pre-release staff account identified (who and what access it had before: )                             |                       |

## B. Tester declaration

I have read `uat-briefing.md`. I will follow the procedure exactly and record the real result of every step. Tester initials: **\_\_** Date: **\_\_**

## C. Execution log

Result: PASS / FAIL / BLOCKED. Evidence: screenshot file name. Defect: ID from section D, if any.

| Step   | Account used          | Start time | Actual result (what you saw) | Result | Evidence file | Defect |
| ------ | --------------------- | ---------- | ---------------------------- | ------ | ------------- | ------ |
| UAT-01 | uat-csr-kitchen       |            |                              |        |               |        |
| UAT-02 | uat-csr-kitchen       |            |                              |        |               |        |
| UAT-03 | uat-csr-kitchen       |            |                              |        |               |        |
| UAT-04 | uat-kitchen           |            |                              |        |               |        |
| UAT-05 | uat-kitchen           |            |                              |        |               |        |
| UAT-06 | uat-kitchen           |            |                              |        |               |        |
| UAT-07 | uat-manager           |            |                              |        |               |        |
| UAT-08 | uat-manager           |            |                              |        |               |        |
| UAT-09 | uat-csr               |            |                              |        |               |        |
| UAT-10 | uat-super             |            |                              |        |               |        |
| UAT-11 | uat-super, uat-target |            |                              |        |               |        |
| UAT-12 | uat-super             |            |                              |        |               |        |
| UAT-13 | uat-super             |            |                              |        |               |        |
| UAT-14 | uat-admin             |            |                              |        |               |        |
| UAT-15 | uat-super             |            |                              |        |               |        |
| UAT-16 | test customer         |            |                              |        |               |        |
| UAT-17 | pre-release account   |            |                              |        |               |        |

Deviations from the procedure (anything done differently from the script, with reason; write "none" if none):

## D. Defect log (test incident report)

One row per problem. Severity: **Critical** = too much access or lost access, or data wrongly changed; **Major** = a feature does not work; **Minor** = wording or cosmetic. Copy each Critical or Major to a GitHub issue labelled `bug` and note the number.

| ID   | Step | Severity | What you did | What you expected | What happened | Evidence file | GitHub issue |
| ---- | ---- | -------- | ------------ | ----------------- | ------------- | ------------- | ------------ |
| D-01 |      |          |              |                   |               |               |              |

If there are none, write "No defects raised": **\_\_**

## E. Completion summary

| Measure                           | Count |
| --------------------------------- | ----- |
| Steps in procedure                | 17    |
| Executed                          |       |
| PASS                              |       |
| FAIL                              |       |
| BLOCKED                           |       |
| Not executed (reason)             |       |
| Defects: Critical / Major / Minor | / /   |

Acceptance criteria coverage (tick when every related step passed):

| AC                                   | Steps                                | Passed? |
| ------------------------------------ | ------------------------------------ | ------- |
| AC1 several roles on an account      | UAT-01                               |         |
| AC2 access is any-of, not broader    | UAT-01, 02, 03, 05, 06, 09           |         |
| AC3 role management rules            | UAT-10, 11, 13, 14, 15               |         |
| AC4 migration keeps access           | UAT-17                               |         |
| AC5 role changes audited             | UAT-11, 12                           |         |
| AC6 customers never get staff access | UAT-16                               |         |
| AC7 permissions combine              | UAT-07, 08                           |         |
| AC8 nav, gate and landing page       | UAT-01, 04, 06, 07, 08               |         |
| AC9 API and old sessions             | N/A: no screen; automated tests only | N/A     |

Overall result recommendation (Accept / Reject / Accept with conditions):

Reason and conditions:

Residual concerns or observations:

UAT end (date, time):

## F. Sign-off

| Role                                                                           | Name | Signature or portal account | Date |
| ------------------------------------------------------------------------------ | ---- | --------------------------- | ---- |
| UAT tester (independent of the operator)                                       |      |                             |      |
| Operator (confirms setup, and that the throwaway uat-\* accounts were deleted) |      |                             |      |

After sign-off: record UAT in the DevAudit portal (release REQ-119), attach this completed record and the screenshots, and approve or request changes there. The portal approval is the formal release decision; this record is its supporting evidence.

Throwaway accounts deleted on (date) by (initials): **\_\_**
