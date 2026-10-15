---
title: Anti-Fraud Alert Persistence
status: todo
priority: urgent
type: feature
tags: [anti-fraud, alerts, database]
created_by: agent
created_at: 2026-10-15T13:57:40Z
position: 220
---

## Notes
Create the smallest safe persistence layer for repeated cooldown-blocked attempts only if existing architecture requires it. Alerts must be triggered from server-side blocked-attempt events, not browser-generated events. Group by business, loyalty program, member/customer, staff member, and active cooldown period. First blocked attempt records only the event; second qualifying blocked attempt creates one alert; further attempts update the same alert count/latest timestamp. Preserve historical event records and do not touch stamps, rewards, customers, memberships, balances, or reward redemption.

## Checklist
- [ ] Determine whether an existing alert/notification table can be reused safely
- [ ] Add minimal alert table/RLS/indexes only if required
- [ ] Add secure server-side trigger or RPC logic from blocked-attempt events to alerts
- [ ] Ensure first blocked attempt creates no repeated-attempt alert
- [ ] Ensure second attempt creates exactly one grouped alert
- [ ] Ensure further attempts update the same grouped alert and count
- [ ] Preserve separation by business, program, member, staff, and cooldown period
- [ ] Prevent client-side creation, mutation, deletion, or cross-business access

## Acceptance
Cooldown-blocked events produce grouped Owner/Admin alerts according to the exact Phase 2 trigger without duplicating cooldown systems or successful stamp records.