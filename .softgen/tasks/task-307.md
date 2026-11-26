---
title: Staff loyalty card assignment data and authorization
status: in_progress
priority: urgent
type: feature
tags: [staff, loyalty-cards, authorization, supabase]
created_by: agent
created_at: 2026-11-26T11:03:45Z
position: 307
---
## Notes
Implement the data model and server-side authorization for assigning multiple loyalty cards to staff within the same business. Preserve existing stamping flows, customer records, rewards, QR behavior, and business isolation. The solution must prevent duplicate assignments, validate same-business ownership, and enforce assignment checks on every stamp issuance request.

Confirmed current state from inspected code:
- `src/pages/dashboard/scan.tsx` issues stamps directly through the `issue_stamp_tx` RPC using the currently selected loyalty program.
- `src/pages/api/staff/search-send-stamp.ts` verifies that the caller is an active staff member with Search & Send permission, but it does not verify that the selected loyalty program is assigned to that specific staff member.
- `src/pages/dashboard/quick-stamp-qr.tsx` generates rotating QR tokens through `generate_quick_stamp_qr_token`, so Quick Issue Stamp must also be constrained by staff-to-program assignment.
- Existing access control is business-level and location-level; there is no current staff-to-loyalty-program assignment layer.

Implemented this turn:
- Added migration `supabase/migrations/20261126110729_staff_loyalty_program_assignments.sql` creating `staff_loyalty_program_assignments` with duplicate prevention, validation triggers, and RLS.
- Added reusable database helpers for manager authorization and staff-to-loyalty-program issuance authorization.
- Updated `issue_stamp_tx`, `generate_quick_stamp_qr_token`, and `quick_stamp_qr_issue_stamp` in SQL so assignment checks happen server-side and revocations take effect immediately.
- Updated `src/pages/api/staff/search-send-stamp.ts` with an explicit same-business loyalty-program check and a direct assignment check before issuing a stamp.

## Checklist
- [x] Inspect existing staff, loyalty program, and stamp-issuance schema and APIs
- [x] Add or adapt assignment persistence to support multiple cards per staff member and shared cards across staff
- [x] Add server-side business and assignment validation for normal Issue Stamp requests
- [x] Add server-side business and assignment validation for Quick Issue Stamp requests
- [x] Ensure assignment removal revokes access immediately without altering historical transactions
- [ ] Validate schema, RLS, and app build behavior

## Acceptance
Staff can issue stamps only for loyalty cards assigned to their own account.
Assignment changes take effect immediately without changing historical stamp transactions.
Unauthorized direct requests targeting unassigned cards are rejected server-side.