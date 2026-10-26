---
title: Birthday Rewards Stage B2 Registration Correction
status: todo
priority: high
type: feature
tags: [birthday-rewards, stage-b, customer-profile, super-admin]
created_by: agent
created_at: 2026-10-26T02:50:48Z
position: 238
---

## Notes
Implement one-time customer birthday registration, read-only customer display, and Super Admin correction workflow after Stage B1 approval path is clear. Customers may register once and cannot edit/delete. Super Admin corrections require a meaningful reason and append-only correction history through the existing Super Admin authorization helper.

## Checklist
- [ ] Add customer birthday registration API with authenticated customer ownership checks and date validation
- [ ] Add read-only birthday display and one-time registration UI to the customer profile
- [ ] Add Super Admin birthday correction API with mandatory reason and append-only correction history
- [ ] Add minimal Super Admin UI for birthday corrections without exposing birthdays to business users
- [ ] Validate API authentication, authorization, input validation, idempotency, and error handling

## Acceptance
Customers can register birthdays once, see their own birthday read-only, and Super Admins can correct birthdays with audited reasons.