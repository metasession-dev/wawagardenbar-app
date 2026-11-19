# Test scope — REQ-122

Risk class: HIGH · Issue #974 · Plan: `compliance/plans/REQ-122/implementation-plan.md` · Bundle: REQ-121 (core) + REQ-122 (co-tracked)

| AC  | Summary                                                                                            | SRS-ID                                 | Verification                              |
| --- | -------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| AC1 | StaffNotification model and raise helper wired to paid customer orders and support tickets         | REQ-DASH-003 (new)                     | e2e (US-B5.3) + unit                      |
| AC2 | Bell with live count, sound, toast, tab badge; acknowledge actions; opening acknowledges           | REQ-DASH-004 (new)                     | e2e (US-B5.3, US-B5.9) + unit             |
| AC3 | Needs-attention panel on the dashboard                                                             | REQ-DASH-005 (new)                     | e2e (US-B5.4)                             |
| AC4 | Staff alert number with WhatsApp PIN verification and consent                                      | REQ-AUTHA-008 (new)                    | e2e (US-B5.5) + unit                      |
| AC5 | On-shift toggle                                                                                    | REQ-DASH-006 (new)                     | e2e + unit                                |
| AC6 | Configurable alert rules with defaults and quiet hours                                             | REQ-SETTINGS-006 (new)                 | unit (US-B5.10)                           |
| AC7 | Escalation job: levels once, on-shift fallback to escalation roles, multi-role dedup, stop on open | REQ-WA-014 (new)                       | unit (US-B5.6 to US-B5.8) + e2e (US-B5.9) |
| AC8 | Verified staff numbers excluded from the customer router                                           | REQ-WA-015 (new), REQ-WA-005 (updated) | e2e (US-B5.11) + unit                     |
| AC9 | `staff_alert` defined and submitted to both accounts                                               | `@srs-deferred`                        | operator evidence                         |
