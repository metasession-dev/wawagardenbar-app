## Security Evidence Summary — REQ-110

**Date:** 2026-10-16
**SAST Tool:** Semgrep (auto config), run via CI Quality Gates (PR #916)
**SAST High/Critical Findings:** 0 (no application code changed — dependency/config-only diff)
**Dependency Audit High/Critical:** Reduced from 35 accepted exceptions to 1 (`braces@3.0.3`, no upstream fix). 4 advisory buckets resolved outright: `brace-expansion` (`GHSA-mh99-v99m-4gvg`, `GHSA-rgw5-rvv9-x895`, `GHSA-qhr7-859c-m2p7`, `GHSA-6j4f-fj2g-mc7p`) via in-range override bump; `nodemailer` (`GHSA-v53p-9fqp-m79j`, `GHSA-prgh-xp8r-p3m5`) via major-version upgrade to 10.1.2.
**RBAC change summary:** N/A — no authorization logic touched.
**Dependency change summary:** `nodemailer` 9.1.1 → 10.1.2 (major version, confirmed no API change for this project's `createTransport`/`sendMail`/`Transporter` usage — see `compliance/plans/REQ-110/implementation-plan.md` §5). `brace-expansion` 1.1.16/2.1.2 → 1.1.21/2.1.7 (patch/minor, same major line, no consumer migration).

Evidence uploaded to META-COMPLY project: wawagardenbar-app
