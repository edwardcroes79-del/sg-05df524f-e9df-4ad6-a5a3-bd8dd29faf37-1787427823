---
title: Anti-Fraud Alert Persistence
status: in_progress
priority: urgent
type: feature
tags: [anti-fraud, alerts, database]
created_by: agent
created_at: 2026-10-15T13:57:40Z
position: 220
---

## Notes
Added the smallest dedicated persistence layer because no reusable Business Owner security-alert table exists. New migration `supabase/migrations/20261015141000_anti_fraud_security_alerts.sql` creates `anti_fraud_security_alerts`, indexes, Owner/Admin/Super Admin read RLS, no-direct-write policy, a server-side trigger function on `anti_fraud_blocked_attempts`, and a server-side mark-read RPC. Alerts are derived only from server-side cooldown-blocked events with `reason = 'cooldown_active'`. The trigger groups by business, loyalty program, customer/member, staff group, and overlapping active cooldown period. The first blocked attempt records only the Phase 1 event and creates no alert. The second qualifying blocked attempt creates one alert. Further qualifying attempts update the same alert with latest timestamp and attempt count. Direct client creation/mutation remains blocked. No stamp issuance, cooldown duration, reward redemption, customer balances, customer profiles, memberships, or transaction history were changed.

## Checklist
- [x] Determine whether an existing alert/notification table can be reused safely
- [x] Add minimal alert table/RLS/indexes only if required
- [x] Add secure server-side trigger or RPC logic from blocked-attempt events to alerts
- [x] Ensure first blocked attempt creates no repeated-attempt alert
- [x] Ensure second attempt creates exactly one grouped alert
- [x] Ensure further attempts update the same grouped alert and count
- [x] Preserve separation by business, program, member, staff, and cooldown period
- [x] Prevent client-side creation, mutation, deletion, or cross-business access

## Acceptance
Cooldown-blocked events produce grouped Owner/Admin alerts according to the exact Phase 2 trigger without duplicating cooldown systems or successful stamp records.