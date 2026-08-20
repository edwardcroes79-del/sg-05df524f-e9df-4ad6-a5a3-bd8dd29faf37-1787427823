---
title: Staff Issue Stamp & Access Denied Implementation
status: in_progress
priority: urgent
type: chore
tags: [staff, authorization, stamp, billing, settings]
created_by: agent
created_at: 2026-08-20T12:20:00Z
position: 16
---

## Notes
Ensure active Staff can issue stamps and redeem rewards safely, while blocking them immediately from Billing and Settings with a clean "Access Denied" screen.

## Checklist
- [x] Implement a reusable Access Denied interface or screen in `billing.tsx` and `settings.tsx`
- [x] Block Staff immediately on Billing page
- [x] Block Staff immediately on Settings page
- [x] Ensure `scan.tsx` captures the authenticated staff's user ID when issuing a stamp or redeeming a reward
- [x] Run project error checks

## Acceptance
1. Staff cannot access Billing/Settings (displays Access Denied).
2. Staff can issue stamps and redeem rewards successfully.