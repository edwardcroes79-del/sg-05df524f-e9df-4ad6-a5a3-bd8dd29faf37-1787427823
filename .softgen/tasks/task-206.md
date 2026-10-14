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
Implemented and fixed one Owner-controlled ON/OFF permission named Allow Search & Send Stamp for staff members. The reported bug was that enabling the toggle for an account labelled Owner failed with "Permission update failed — Failed to update Search & Send Stamp permission." Root cause: the Team Members UI rendered a writable staff-only permission toggle for Owner/non-staff rows, and the permission-update API did not clearly reject non-staff rows before the update path. The API also no longer updates a non-existent `business_users.updated_at` column. Owner rows now show "Owner access is not restricted by this staff setting." instead of a writable toggle. Actual Staff rows keep the toggle and save through the secured API. Server-side Staff OFF/ON enforcement for Search & Send Stamp remains in place. QR/NFC stamping, location assignments, stamps, rewards, customer data, owner role, and unrelated permissions were not changed. TypeScript validation passed with `npx tsc --noEmit`, safe SQL role/permission checks ran, and `check_for_errors` passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect actual Team Members roles, `business_users` schema, and permission-update API
- [x] Identify exact cause of Owner-row toggle failure
- [x] Hide or disable Search & Send Stamp toggle for Owner accounts and show unrestricted Owner label
- [x] Keep toggle enabled and saving correctly for actual Staff accounts
- [x] Preserve server-side OFF/ON enforcement for Staff Search & Send Stamp
- [x] Preserve QR/NFC stamping, location assignments, rewards, and unrelated permissions
- [x] Run TypeScript/static validation and safe non-destructive permission checks
- [x] Report root cause, changed files, and actual test results

## Acceptance
Owner rows cannot be changed with this staff-only permission and show a clear unrestricted-access label. Staff rows can be enabled/disabled successfully. Direct Search & Send requests remain denied for Staff when OFF and allowed when ON, while QR/NFC stamping remains unchanged.