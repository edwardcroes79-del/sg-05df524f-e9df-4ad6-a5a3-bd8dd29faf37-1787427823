---
title: Super Admin Contract Expiration Notifications
status: done
priority: urgent
type: feature
tags: [contracts, notifications, super-admin]
created_by: agent
created_at: 2026-09-28T11:52:00Z
position: 77
---

## Notes
Added Super Admin contract expiration notifications to the existing Super Admin notification bell/read-count system. Contract reminder rows for Super Admin are now loaded from `contract_reminders`, filtered to the current business contract period, and displayed alongside existing Super Admin notifications without creating a duplicate notification system. Notifications include business name, current plan, contract term, contract expiration date, days remaining or expired status, and route the Super Admin to Merchants & Subscriptions for action. Duplicate prevention remains enforced by the existing contract reminder unique constraint, and renewed contracts use the new stored contract end date while old-period reminders remain historical and hidden from the current bell period. No contract logic, renewal logic, billing, plans, add-ons, business access, RLS, or authentication architecture was changed. Targeted checks covered 30-day, 14-day, 7-day, 1-day, expiration milestones, duplicate prevention, Super Admin-only scope, renewed-period visibility, and project validation passed.

## Checklist
- [x] Inspect existing Super Admin notification bell and read-count system
- [x] Inspect contract reminder processing and reminder tracking rows
- [x] Load Super Admin contract reminder rows into the existing notification data flow
- [x] Display 30-day, 14-day, 7-day, 1-day, and expired contract notifications
- [x] Include business name, current plan, contract term, expiration date, days remaining, and action/status
- [x] Preserve duplicate prevention when scheduled processing runs more than once
- [x] Ensure renewed contracts use the new contract end date for visible notifications
- [x] Ensure notifications are Super Admin-only and not sent to other businesses through this bell source
- [x] Preserve contract logic, renewal logic, billing, plans, add-ons, access, RLS, and auth
- [x] Run targeted notification regression checks and project validation

## Acceptance
Super Admin sees contract expiration milestones in the existing notification bell and unread count.
Duplicate notifications are not created for repeated scheduled runs.
Renewed contracts follow the new contract end date without changing billing, plans, add-ons, access, RLS, or auth.