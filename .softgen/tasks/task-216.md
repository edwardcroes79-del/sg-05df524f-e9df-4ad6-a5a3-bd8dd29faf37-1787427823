---
title: Cooldown Blocked Attempt Events
status: done
priority: high
type: feature
tags: [anti-fraud, audit, events]
created_by: agent
created_at: 2026-10-15T13:29:52Z
position: 216
---

## Notes
Implemented Phase 1 server-side event recording for cooldown-blocked stamp attempts in `anti_fraud_blocked_attempts`. Existing audit/event storage was inspected; a dedicated table was added because Phase 1 needs structured cooldown investigation data without recording blocked attempts as successful stamps. Stored fields are limited to business, loyalty program, customer/member, loyalty card, staff user when available, verification method, cooldown duration, remaining wait time, reason, and attempted timestamp. RLS allows Owner/Admin/Super Admin read access and blocks direct client writes or mutation; writes happen through the security-definer shared stamp RPC only. Blocked attempts do not create `stamp_transactions`, do not update rewards or loyalty-card counters, and do not restart or extend cooldowns. Rollback-only validation confirmed a blocked repeat attempt inserts one blocked-attempt event while preserving successful stamp history semantics. No Phase 2 alerts, badges, email notifications, or dashboard alert UI were built.

## Checklist
- [x] Inspect existing audit/event tables before creating a new table
- [x] Add/reuse secure server-side event recording for cooldown-blocked attempts
- [x] Store minimal investigation fields only
- [x] Prevent unauthorized modification/deletion through RLS or server-only writes
- [x] Ensure blocked attempts do not alter successful stamp/reward history
- [x] Avoid duplicate/excessive event writes under repeated blocked attempts

## Acceptance
Cooldown-blocked attempts are securely recorded for future Phase 2 investigation without changing successful stamp history or creating dashboard alerts.