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
Implement one Owner-controlled ON/OFF permission named Allow Search & Send Stamp for staff members. Inspect the existing Staff Management page, staff permission system, Search & Send Stamp UI, and backend stamp-award APIs before changing schema/code. Default new staff to OFF and ensure existing staff are not accidentally granted the new permission. When OFF, staff must not see/use the customer-search-and-stamp workflow, and direct API calls must be denied server-side. Do not change QR/NFC stamping permissions, Owner privileges, stamp balances, rewards, or unrelated features. Enforce business isolation and preserve all customer/reward/history data.

## Checklist
- [ ] Inspect Staff Management page, staff permission schema, Search & Send Stamp UI, and stamp-award APIs
- [ ] Determine whether a schema migration is required for `allow_search_send_stamp`
- [ ] Add Owner-controlled Allow Search & Send Stamp toggle per staff member, default OFF
- [ ] Hide or disable Search & Send Stamp workflow for staff when permission is OFF
- [ ] Enforce permission server-side on every relevant customer-search-and-stamp award API
- [ ] Preserve QR/NFC stamping behavior and Owner privileges
- [ ] Verify one business cannot read or change another business's staff permissions
- [ ] Run static validation and safe non-destructive permission checks
- [ ] Report changed files, default behavior, migration requirements, and actual test results

## Acceptance
Owners can turn Allow Search & Send Stamp on or off per staff member. Staff with permission OFF cannot use or directly call the Search & Send Stamp award flow. Staff with permission ON can use the existing flow. QR/NFC stamping and unrelated loyalty history remain unchanged.