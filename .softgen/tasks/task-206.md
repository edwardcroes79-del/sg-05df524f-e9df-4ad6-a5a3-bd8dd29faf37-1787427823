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
Implemented one Owner-controlled ON/OFF permission named Allow Search & Send Stamp for staff members. New reported bug: enabling the toggle for the account labelled Owner fails with "Permission update failed — Failed to update Search & Send Stamp permission." This permission is intended to control Staff access only, not Owner access. Diagnose actual staff roles, permission-update API, and schema; hide/disable Owner controls with a clear Owner-unrestricted label; keep toggles working for Staff; preserve server-side Search & Send denial when Staff permission is OFF and allowance when ON. Do not alter Owner role, QR/NFC stamping, stamps, rewards, location assignments, customer data, or unrelated permissions.

## Checklist
- [ ] Inspect actual Team Members roles, `business_users` schema, and permission-update API
- [ ] Identify exact cause of Owner-row toggle failure
- [ ] Hide or disable Search & Send Stamp toggle for Owner accounts and show unrestricted Owner label
- [ ] Keep toggle enabled and saving correctly for actual Staff accounts
- [ ] Preserve server-side OFF/ON enforcement for Staff Search & Send Stamp
- [ ] Preserve QR/NFC stamping, location assignments, rewards, and unrelated permissions
- [ ] Run TypeScript/static validation and safe non-destructive permission checks
- [ ] Report root cause, changed files, and actual test results

## Acceptance
Owner rows cannot be changed with this staff-only permission and show a clear unrestricted-access label. Staff rows can be enabled/disabled successfully. Direct Search & Send requests remain denied for Staff when OFF and allowed when ON, while QR/NFC stamping remains unchanged.