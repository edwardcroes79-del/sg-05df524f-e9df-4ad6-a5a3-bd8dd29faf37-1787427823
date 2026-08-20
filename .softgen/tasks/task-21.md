---
title: Phase 3 Issue Stamp workflow
status: in_progress
priority: urgent
type: feature
tags: [phase-3, issue-stamp, transactions, staff-access]
created_by: agent
created_at: 2026-08-20T15:13:55Z
position: 21
---

## Notes
Phase 3 is strictly focused on fixing the "Issue Stamp" workflow for both Business Admin and Staff.
Ensure that:
1. Both Business Admins and Staff can search, select a customer, select an existing loyalty program, and add a stamp successfully.
2. A real `stamp_transactions` record is created with `business_id`, `customer_id`, `loyalty_program_id`, staff/owner `user_id`, and `created_at`.
3. The customer receives the stamp update in real-time.
4. No fake counters, fake programs, or duplicate data is created.

## Checklist
- [x] Inspect the transaction logic and RLS for `stamp_transactions`
- [x] Open and examine `src/pages/dashboard/scan.tsx` implementation for issuing stamps
- [/] Ensure the database function/RPC for issuing stamps supports both Owners and Staff members
- [ ] Add a real-time business dashboard notification listener for owners when staff issue stamps
- [ ] Verify `stamp_transactions` is correctly created and references the correct authenticated user
- [ ] Run typescript and validation tests
- [ ] Deliver short summary and wait for instructions