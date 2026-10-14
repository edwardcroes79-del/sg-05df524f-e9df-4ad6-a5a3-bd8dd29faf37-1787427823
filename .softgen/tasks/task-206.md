---
title: Staff Search Send Stamp Permission
status: done
priority: urgent
type: bug
tags: [staff, permissions, stamps, authorization]
created_by: agent
created_at: 2026-10-14T19:45:01Z
position: 206
---

## Notes
Implemented and fixed one Owner-controlled ON/OFF permission named Allow Search & Send Stamp for staff members. Latest bug: the stamping page showed "Search & Send Stamp is off for this staff account" for a logged-in Owner and hid the customer search field. Root cause: the stamping page resolved an active `business_users` row before checking ownership, so an Owner who also had a business-user row could be treated as staff-restricted. The server-side Search & Send endpoint also needed to explicitly apply the ON/OFF permission only to `role = "staff"`. Fixed `src/pages/dashboard/scan.tsx` to check owned business first and grant Owners unrestricted Search & Send access. Fixed `src/pages/api/staff/search-send-stamp.ts` so non-owners must have an active staff row with `allow_search_send_stamp = true`. Updated the database helper so Owners return true and staff permission checks only apply to `role = 'staff'`. QR/NFC and hardware scanner stamping, location assignments, stamps, rewards, customer data, owner role, and unrelated permissions were not changed. Safe SQL role/access checks ran, `npx tsc --noEmit` passed, and `check_for_errors` passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect stamping page role resolution and UI gating for Search & Send Stamp
- [x] Inspect server-side Search & Send stamp API authorization
- [x] Inspect database permission helper and actual role handling
- [x] Identify exact root cause of Owner being treated as staff-restricted
- [x] Ensure Owners always see and can use the customer search workflow
- [x] Ensure Staff OFF remains blocked and Staff ON remains allowed
- [x] Preserve QR/NFC and hardware scanner stamping behavior
- [x] Run TypeScript/static validation and safe non-destructive role checks
- [x] Report root cause, changed files, and actual test results

## Acceptance
Owners can use Search & Send Stamp without a staff permission toggle. Staff rows obey the ON/OFF permission server-side and in the UI. QR/NFC stamping and unrelated loyalty behavior remain unchanged.