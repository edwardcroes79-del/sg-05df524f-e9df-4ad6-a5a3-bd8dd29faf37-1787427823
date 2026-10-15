---
title: Security Alerts Verification
status: todo
priority: high
type: chore
tags: [anti-fraud, qa, security]
created_by: agent
created_at: 2026-10-15T13:57:40Z
position: 222
---

## Notes
Verify Phase 2 with safe development/staging or rollback-only test data. Clearly distinguish SQL checks, static validation, and browser/end-to-end cases. Do not claim production safety from build checks. Do not deploy. Required coverage: first blocked attempt no alert, second creates alert, further updates count, staff/member/program/business separation, anti-fraud OFF no cooldown-violation alerts, previous records preserved, Owner/Admin list/read/mark-read, Staff denial, cross-business denial, refresh persistence, UI states, and no breakage to stamping/search/QR/reward redemption. Any unverified real-world scanner/concurrency case must be reported.

## Checklist
- [ ] Run rollback-only SQL tests for alert grouping and read state
- [ ] Verify unauthorized Staff and cross-business access are denied server-side
- [ ] Run project checks
- [ ] Verify dashboard loading/empty/error states where possible
- [ ] Document unverified browser/E2E cases and Phase 1 dependencies
- [ ] Report files changed, migrations, trigger/grouping logic, authorization, tests, and staging readiness

## Acceptance
The completion report includes actual test results, failures/unverified cases, Phase 1 dependencies, and confirms no deployment was performed.