---
title: Staff Search Send Stamp Permission
status: in_progress
priority: urgent
type: bug
tags: [staff, permissions, stamps, authorization]
created_by: agent
created_at: 2026-10-14T19:45:01Z
position: 206
---

## Notes
Implemented and fixed one Owner-controlled ON/OFF permission named Allow Search & Send Stamp for staff members. New reported bug: the stamping page shows "Search & Send Stamp is off for this staff account" for a logged-in Owner and hides the customer search field. Owners must always have Search & Send Stamp access under the existing Owner role without needing a staff permission toggle. Diagnose the actual authenticated role resolution, database permission helper, stamping page UI gating, and Search & Send stamp API authorization. Apply staff ON/OFF only to actual `staff` rows. Preserve QR/NFC and hardware scanner stamping, business isolation, location permissions, program authorization, stamp balances, rewards, and unrelated features.

## Checklist
- [ ] Inspect stamping page role resolution and UI gating for Search & Send Stamp
- [ ] Inspect server-side Search & Send stamp API authorization
- [ ] Inspect database permission helper and actual role handling
- [ ] Identify exact root cause of Owner being treated as staff-restricted
- [ ] Ensure Owners always see and can use the customer search workflow
- [ ] Ensure Staff OFF remains blocked and Staff ON remains allowed
- [ ] Preserve QR/NFC and hardware scanner stamping behavior
- [ ] Run TypeScript/static validation and safe non-destructive role checks
- [ ] Report root cause, changed files, and actual test results

## Acceptance
Owners can use Search & Send Stamp without a staff permission toggle. Staff rows obey the ON/OFF permission server-side and in the UI. QR/NFC stamping and unrelated loyalty behavior remain unchanged.