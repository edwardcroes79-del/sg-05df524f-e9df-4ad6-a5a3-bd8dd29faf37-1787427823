---
title: Staff Search Send Stamp Permission
status: in_progress
priority: high
type: feature
tags: [staff, permissions, stamps, authorization]
created_by: agent
created_at: 2026-10-14T19:45:01Z
position: 206
---

## Notes
Implemented one Owner-controlled ON/OFF permission named Allow Search & Send Stamp for staff members. Inspection found staff permissions are stored on `business_users`, the Search & Send customer picker uses `search_business_customers`, and stamp awarding uses the `issue_stamp_tx` Supabase RPC. Added membership-scoped `business_users.allow_search_send_stamp boolean NOT NULL DEFAULT false`, preserving OFF default for existing and new staff. Added a database helper plus `search_business_customers` guard so disabled staff cannot use the customer-search list directly. Added Owner-only permission update API and a Search & Send stamp API that rechecks Owner/staff permission before calling the existing stamp RPC with the user's session. The regular QR/NFC/hardware scanner path continues to use the existing `issue_stamp_tx` RPC unchanged. No customer data, stamp balances, rewards, transactions, or unrelated features were modified.

## Checklist
- [x] Inspect Staff Management page, staff permission schema, Search & Send Stamp UI, and stamp-award APIs
- [x] Determine whether a schema migration is required for `allow_search_send_stamp`
- [x] Add Owner-controlled Allow Search & Send Stamp toggle per staff member, default OFF
- [x] Hide or disable Search & Send Stamp workflow for staff when permission is OFF
- [x] Enforce permission server-side on every relevant customer-search-and-stamp award API
- [x] Preserve QR/NFC stamping behavior and Owner privileges
- [x] Verify one business cannot read or change another business's staff permissions
- [ ] Run static validation and safe non-destructive permission checks
- [ ] Report changed files, default behavior, migration requirements, and actual test results

## Acceptance
Owners can turn Allow Search & Send Stamp on or off per staff member. Staff with permission OFF cannot use or directly call the Search & Send Stamp award flow. Staff with permission ON can use the existing flow. QR/NFC stamping and unrelated loyalty history remain unchanged.