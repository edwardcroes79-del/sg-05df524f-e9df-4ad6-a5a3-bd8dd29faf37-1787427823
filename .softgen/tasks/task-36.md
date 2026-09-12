---
title: Stamp Persistence Reliability Investigation
status: in_progress
priority: urgent
type: bug
tags: [stamps, qr-scan, supabase, reliability]
created_by: agent
created_at: 2026-09-12T03:58:38Z
position: 36
---
## Notes
Investigate the Business → Issue Stamp → Scan Customer QR flow where the business UI can show “Stamp Issued” but the customer stamp count does not increase. Live database checks showed zero orphan stamp rows, but multiple loyalty card counters were inconsistent with persisted `stamp_transactions`. The fix makes `stamp_transactions` the source of truth: the RPC verifies the inserted transaction/card before returning success, and existing card counters were repaired from immutable transaction history.

## Checklist
- [x] Inspect Business QR scan frontend flow and success handling
- [x] Inspect Supabase stamp RPC/function definition and return payload
- [x] Inspect relevant table schema, constraints, triggers, and RLS policies
- [x] Inspect customer card stamp-count loading path
- [x] Identify whether stamps are missing, inserted into wrong program/business, or inserted but not reflected in card count
- [x] Add proof-of-persistence verification only if the current flow does not already prove the correct persisted record and count
- [x] Repair existing card counters from persisted stamp transaction history
- [ ] Validate with repeated real database transaction checks
- [x] Run project error checks

## Acceptance
Business UI only shows “Stamp Issued” after Supabase confirms the persisted stamp row belongs to the exact customer, business, loyalty program, and card being displayed.
Customer card stamp count reflects the persisted transaction/card state after every successful issue-stamp response.
No unrelated systems are modified.