When it comes to compliance—whether you’re dealing with **HIPAA** (Healthcare), **SOC2** (Data Security), **ISO 9001** (Quality Management), or **CFR Part 11** (Life Sciences)—the "standard" isn't just about having a list of passes and fails. It’s about proving a **Traceable Chain of Evidence.**

The global gold standard for software test documentation is **ISO/IEC/IEEE 29119-3**.

---

## The Core Compliance Documents

To satisfy an auditor, your documentation must answer three questions: *What did you plan to do? What did you actually do? And can you prove the results are valid?*

### 1. Test Plan (The Strategy)

This is your "contract" for the project. It defines the scope, resources, and environment. For compliance, it must include:

* **Risk Assessment:** What happens if this feature fails?
* **Approval Sign-offs:** Digital signatures from stakeholders (QA Lead, Product Owner).
* **Pass/Fail Criteria:** Quantifiable metrics for what constitutes a "go" for production.

### 2. Requirements Traceability Matrix (RTM)

This is the **most important document** for compliance. It is a simple table that links:

* Business Requirements $\rightarrow$ Functional Specifications $\rightarrow$ Test Cases $\rightarrow$ Test Results.
* **The Auditor's View:** If I point to a specific regulation or feature, can you show me exactly which test case verified it?

### 3. Test Case Specifications

For compliance, a test case cannot just say "Login works." It needs:

* **Pre-conditions:** The exact state of the system before the test.
* **Detailed Steps:** Clear enough for a third party to replicate.
* **Expected vs. Actual Results:** Clear evidence of what was supposed to happen.

### 4. Test Summary Report (TSR)

This is the final "Verdict." It summarizes the execution cycle and includes:

* **Defect Logs:** Every bug found, its severity, and its resolution.
* **Residual Risk:** Any known issues that are being pushed to production (and who authorized them).
* **Evidence Attachments:** Screenshots, log files, or timestamps.

---

## Comparison of Compliance Frameworks

| Standard | Focus Area | Key Documentation Requirement |
| --- | --- | --- |
| **ISO/IEC 29119** | General Software | Comprehensive lifecycle documentation (Plans, Specs, Reports). |
| **SOC2 / ISO 27001** | Security & Privacy | Evidence of "Change Management" (proving no code reaches prod without a test). |
| **FDA 21 CFR Part 11** | Life Sciences | Electronic signatures, audit trails, and "Validation Protocols." |
| **PCI-DSS** | Payments | Penetration testing reports and vulnerability scan logs. |

---

## Pro-Tips for "Audit-Ready" QA

* **Immutable Logs:** Auditors hate spreadsheets that anyone can edit. Use tools (like Jira, TestRail, or Azure DevOps) that provide an automated audit trail of who changed what and when.
* **The "Bus Test":** If your lead QA gets hit by a bus, can a stranger follow the documentation to understand the current state of quality? If not, it’s not compliant.
* **Version Control:** Ensure your test cases are versioned alongside the software. Testing version 2.0 of a tool using version 1.0’s test cases is a major red flag.

---
