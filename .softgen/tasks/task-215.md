---
title: Anti-Fraud Stamp Enforcement
status: done
priority: urgent
type: feature
tags: [anti-fraud, stamps, security]
created_by: agent
created_at: 2026-10-15T13:29:52Z
position: 215
---

## Notes
Implemented server-side cooldown enforcement in the shared stamp issuance RPC `public.issue_stamp_core_tx`, which is the inspected shared path used by current supported stamp issuance flows including QR/manual scan flows, hardware/camera scan paths that call the same RPC, Search & Send Stamp, and Quick Stamp QR issuance. When anti-fraud is ON, the RPC locks the member/business/program tuple with `pg_advisory_xact_lock`, checks the latest successful earned stamp transaction for the same business, loyalty program, customer, and loyalty card within the configured cooldown, and returns a clear blocked response with `reason = anti_fraud_cooldown`, `cooldown_minutes`, and `remaining_seconds`. Cooldown starts only after a successful stamp transaction because enforcement reads from successful `stamp_transactions` rows. Failed, unauthorized, rejected, and blocked attempts do not create stamp transactions and do not extend the cooldown. When anti-fraud is OFF, repeat stamps are not blocked by this cooldown; existing authorization, business access, location access, rate limits, customer/program validation, reward logic, and stamp history updates remain active. Rollback-only validation passed for OFF repeat stamping, ON cooldown blocking, loyalty-program boundary isolation, and blocked response fields.

## Checklist
- [x] Identify all current stamp issuance APIs/RPCs and shared server-side logic
- [x] Add a reusable cooldown check around successful stamp issuance
- [x] Make check + successful issuance concurrency-safe
- [x] Return clear blocked response including remaining wait time
- [x] Ensure cooldown starts only after successful stamp issuance
- [x] Ensure failed/unauthorized/rejected attempts do not start or extend cooldown
- [x] Cover QR, NFC, camera, hardware scanner, and Search & Send Stamp paths
- [x] Verify business and loyalty-program boundaries are respected

## Acceptance
With anti-fraud ON, repeat stamps for the same member/business/program are blocked until cooldown expiry across all supported stamp paths. With anti-fraud OFF, repeat stamping is not blocked by this cooldown.