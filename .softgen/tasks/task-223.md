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
Urgent fix for missing Owner/Admin security alerts after confirmed anti-fraud cooldown blocks. Diagnosis found the reported QR flow did record server-side `anti_fraud_blocked_attempts`: same business `3ea7dd04-371d-4e61-aa57-3c38c2abcc65`, program `465cf71f-3a48-496d-b0b5-67911c31449d`, customer `cd4c0017-2eb8-445f-927f-c5fea1906a3b`, staff `5d9203b2-070e-400c-9646-5f4f88019e25`, reason `cooldown_active`, method `qr_scan`, blocked count 2. Matching `anti_fraud_security_alerts` count was 0, so the failure was between recorded blocked events and grouped alert creation, not QR cooldown enforcement and not dashboard retrieval. The trigger was enabled and rollback sequential tests showed future inserts can trigger, so the missing real alert was caused by existing qualifying blocked events not being reconciled into alerts, combined with non-idempotent update logic that could overcount if events were reprocessed. Search & Send was inspected and calls `issue_stamp_tx`; live database inspection confirms `issue_stamp_tx` delegates to `issue_stamp_core_tx`, and `issue_stamp_core_tx` records cooldown events. Applied smallest alert-layer fix only: added reusable `upsert_anti_fraud_security_alert_from_blocked_attempt`, rewired the trigger to call it, changed alert updates to exact/idempotent `GREATEST(v_attempt_count, attempt_count)`, and backfilled existing `cooldown_active` events. No stamp issuance, cooldown duration, reward redemption, customer balances, transaction history, subscription plans, or Phase 3 features were changed. No deployment was performed.

## Checklist
- [x] Inspect Phase 1 shared cooldown event recording and actual blocked-event reason values
- [x] Inspect Phase 2 grouped alert trigger, alert schema, RLS, dashboard API, and dashboard page
- [x] Check whether confirmed blocked QR attempts created events, alerts, and dashboard-readable rows
- [x] Identify exact event-to-alert failure point
- [x] Apply smallest safe fix without changing stamp issuance, cooldown duration, reward redemption, balances, or history
- [ ] Verify first blocked attempt records event without alert
- [ ] Verify second qualifying blocked attempt creates one alert and later attempts update it
- [x] Verify Search & Send uses shared cooldown/event/alert mechanism
- [ ] Verify cross-method QR/Search & Send shared cooldown behavior where executable
- [ ] Verify Owner/Admin access, staff denial, business/program isolation, unread/read persistence, and project checks

## Acceptance
The missing alert root cause is fixed, QR and Search & Send share the same server-side cooldown alert mechanism, dashboard alerts are retrievable by authorized Owner/Admin users, and the report clearly lists executed tests, unverified cases, files/migrations changed, and confirms no deployment was performed.