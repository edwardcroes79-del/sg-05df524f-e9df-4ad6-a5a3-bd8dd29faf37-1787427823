---
title: Anti-Fraud Alert Missing Fix
status: in_progress
priority: urgent
type: bug
tags: [anti-fraud, alerts, search-send, security]
created_by: agent
created_at: 2026-10-15T14:32:58Z
position: 223
---

## Notes
Urgent fix for missing Owner/Admin security alerts after confirmed anti-fraud cooldown blocks. Diagnose the complete existing flow from shared stamp rejection to `anti_fraud_blocked_attempts`, grouped alert creation, dashboard API retrieval, unread badge, and mark-read behavior. Verify Search & Send Stamp uses the same shared cooldown/event/alert mechanism as QR stamping. Do not rebuild Phase 1, create a second cooldown system, change reward redemption, modify customer balances, or deploy. Use safe development/staging SQL checks and test data only. If a migration/code correction is required, make the smallest safe change and report exact root cause, changed files, tests, unverified cases, and deployment restrictions.

## Checklist
- [ ] Inspect Phase 1 shared cooldown event recording and actual blocked-event reason values
- [ ] Inspect Phase 2 grouped alert trigger, alert schema, RLS, dashboard API, and dashboard page
- [ ] Check whether confirmed blocked QR attempts created events, alerts, and dashboard-readable rows
- [ ] Identify exact event-to-alert failure point
- [ ] Apply smallest safe fix without changing stamp issuance, cooldown duration, reward redemption, balances, or history
- [ ] Verify first blocked attempt records event without alert
- [ ] Verify second qualifying blocked attempt creates one alert and later attempts update it
- [ ] Verify Search & Send uses shared cooldown/event/alert mechanism
- [ ] Verify cross-method QR/Search & Send shared cooldown behavior where executable
- [ ] Verify Owner/Admin access, staff denial, business/program isolation, unread/read persistence, and project checks

## Acceptance
The missing alert root cause is fixed, QR and Search & Send share the same server-side cooldown alert mechanism, dashboard alerts are retrievable by authorized Owner/Admin users, and the report clearly lists executed tests, unverified cases, files/migrations changed, and confirms no deployment was performed.