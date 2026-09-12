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
Investigate the Business → Issue Stamp → Scan Customer QR flow where the business UI can show “Stamp Issued” but the customer stamp count does not increase. Do not make speculative fixes. Verify the exact QR scan payload, selected business/program/customer IDs, RPC/API used, database transaction behavior, RLS policies, duplicate scan handling, and customer card query/display path. Only modify the stamp issuance path if evidence identifies the root cause.

## Checklist
- [ ] Inspect Business QR scan frontend flow and success handling
- [ ] Inspect Supabase stamp RPC/function definition and return payload
- [ ] Inspect relevant table schema, constraints, triggers, and RLS policies
- [ ] Inspect customer card stamp-count loading path
- [ ] Identify whether stamps are missing, inserted into wrong program/business, or inserted but not reflected in card count
- [ ] Add proof-of-persistence verification only if the current flow does not already prove the correct persisted record and count
- [ ] Validate with repeated real database transaction checks
- [ ] Run project error checks

## Acceptance
Business UI only shows “Stamp Issued” after Supabase confirms the persisted stamp row belongs to the exact customer, business, loyalty program, and card being displayed.
Customer card stamp count reflects the persisted transaction/card state after every successful issue-stamp response.
No unrelated systems are modified.