---
title: Security Alert Foundation Review
status: done
priority: urgent
type: chore
tags: [anti-fraud, alerts, security, review]
created_by: agent
created_at: 2026-10-15T13:57:40Z
position: 219
---

## Notes
Phase 2 foundation inspection completed before implementing alerts. The actual Phase 1 schema contains `anti_fraud_blocked_attempts` with the required server-side fields: business, loyalty program, customer/member, loyalty card, staff user, verification method, cooldown duration, remaining seconds, reason, and attempted timestamp. The event is written by the shared server-side stamp RPC only; RLS blocks direct client writes and preserves Owner/Admin/Super Admin read access. Owner/Admin authorization is available through `can_manage_business_settings`, and the anti-fraud settings API already uses server-side auth validation. Existing notification patterns are limited to Super Admin read-state/approval flows and owner realtime toasts for successful stamps; there is no reusable persisted Business Owner security-alert table. Phase 2 therefore requires a small dedicated alert table derived from existing blocked-attempt events, not a second cooldown system or duplicate event table. No blocker was found in the Phase 1 event foundation. Phase 1/2 were not deployed automatically.

## Checklist
- [x] Inspect Phase 1 anti-fraud migration and blocked-attempt schema
- [x] Inspect live database schema and RLS/policies for anti-fraud event records
- [x] Confirm blocked attempts contain business, program, member, staff, timestamp, duration, and remaining wait fields
- [x] Inspect Owner/Admin role helpers and existing dashboard authorization patterns
- [x] Inspect existing dashboard notification or activity UI/API patterns
- [x] Confirm whether alerts can be built without duplicating event records
- [x] Document blockers if the Phase 1 event foundation is unsafe or incomplete

## Acceptance
The implementation path is based on the actual Phase 1 event schema and existing project architecture, or the task stops with a clear blocker before code changes.