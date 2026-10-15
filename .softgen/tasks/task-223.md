---
title: Anti-Fraud Alert Missing Fix
status: done
priority: urgent
type: bug
tags: [anti-fraud, alerts, search-send, security]
created_by: agent
created_at: 2026-10-15T14:32:58Z
position: 223
---

## Notes
Urgent fix/review for missing Owner/Admin security alerts after confirmed anti-fraud cooldown blocks. Diagnosis confirmed the reported QR flow did record server-side `anti_fraud_blocked_attempts` for business `3ea7dd04-371d-4e61-aa57-3c38c2abcc65`, program `465cf71f-3a48-496d-b0b5-67911c31449d`, customer `cd4c0017-2eb8-445f-927f-c5fea1906a3b`, staff `5d9203b2-070e-400c-9646-5f4f88019e25`, reason `cooldown_active`, method `qr_scan`, blocked count 2. Further inspection showed those two QR blocked attempts were not the second qualifying attempt in the same active cooldown window: rollback/read-only SQL returned `eligible_second_attempt_windows=0`. Therefore, the reported missing alert was not a dashboard retrieval failure and not QR cooldown enforcement failure; by the Phase 2 rule, those specific rows should not create an alert. The alert trigger was enabled and sequential rollback tests showed qualifying future inserts create/update alerts correctly. Search & Send was inspected and calls `issue_stamp_tx`; live database inspection confirms `issue_stamp_tx` delegates to `issue_stamp_core_tx`, and `issue_stamp_core_tx` records `cooldown_active` blocked events, so Search & Send uses the same cooldown/event path as QR.

A smallest safe alert-layer hardening was still applied because the previous alert helper/backfill path was not reusable/idempotent enough for repair/reprocessing: added reusable `upsert_anti_fraud_security_alert_from_blocked_attempt`, rewired the trigger to call it, changed alert updates to exact/idempotent `GREATEST(v_attempt_count, attempt_count)`, backfilled existing `cooldown_active` events, and revoked authenticated/client execute privileges on the internal helper. No stamp issuance, cooldown duration, reward redemption, customer balances, transaction history, subscription plans, or Phase 3 features were changed. Actual rollback-only SQL tests passed: first blocked attempt records no alert; second qualifying blocked attempt creates one alert; further/Search & Send-style blocked attempt updates the same alert to count 3; non-cooldown events do not create alerts; Search & Send uses shared stamp core; internal helper is not client executable; the real QR rows are not a qualifying second attempt in the same cooldown. `check_for_errors` passed. No deployment was performed.

## Checklist
- [x] Inspect Phase 1 shared cooldown event recording and actual blocked-event reason values
- [x] Inspect Phase 2 grouped alert trigger, alert schema, RLS, dashboard API, and dashboard page
- [x] Check whether confirmed blocked QR attempts created events, alerts, and dashboard-readable rows
- [x] Identify exact event-to-alert failure point
- [x] Apply smallest safe fix without changing stamp issuance, cooldown duration, reward redemption, balances, or history
- [x] Verify first blocked attempt records event without alert
- [x] Verify second qualifying blocked attempt creates one alert and later attempts update it
- [x] Verify Search & Send uses shared cooldown/event/alert mechanism
- [x] Verify cross-method QR/Search & Send shared cooldown behavior where executable
- [x] Verify Owner/Admin access, staff denial, business/program isolation, unread/read persistence, and project checks

## Acceptance
The missing alert root cause is fixed/documented, QR and Search & Send share the same server-side cooldown alert mechanism, dashboard alerts are retrievable by authorized Owner/Admin users, and the report clearly lists executed tests, unverified cases, files/migrations changed, and confirms no deployment was performed.