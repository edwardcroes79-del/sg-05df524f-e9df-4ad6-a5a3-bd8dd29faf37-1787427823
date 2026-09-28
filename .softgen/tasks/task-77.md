---
title: Super Admin Contract Expiration Notifications
status: in_progress
priority: urgent
type: feature
tags: [contracts, notifications, super-admin]
created_by: agent
created_at: 2026-09-28T11:53:57Z
position: 77
---

## Notes
Add Super Admin notifications for upcoming business contract expirations using the existing Super Admin notification bell and unread-count system. Notifications must be generated for 30, 14, 7, and 1 days remaining plus contract expired. Each notification must include the business name, current plan, contract term, expiration date, days remaining, and clear action/status. Do not create a duplicate notification system. Do not create duplicates if the scheduled processor runs repeatedly. If a business renews, notifications must use the new contract end date and not repeat old-period notifications. Do not change contract expiration logic, renewal logic, billing, plans, add-ons, business access, RLS, or authentication.

## Checklist
- [ ] Inspect existing Super Admin notification bell, unread count, and read tracking
- [ ] Inspect contract reminder processor and tracking table behavior
- [ ] Add Super Admin contract expiration notification items through the existing notification system
- [ ] Include business name, plan, contract term, expiration date, days remaining, and status/action text
- [ ] Prevent duplicate Super Admin notifications per business, contract period, and milestone
- [ ] Ensure renewed contracts use the new stored contract end date
- [ ] Verify notifications are not sent to other businesses
- [ ] Test all five milestones and duplicate prevention
- [ ] Run project validation

## Acceptance
Super Admin bell shows 30/14/7/1-day and expired contract notifications with unread counts.
Repeated scheduled processing does not create duplicate Super Admin notifications for the same contract period and milestone.
Contract renewal causes notifications to follow the new contract end date without changing billing, plans, add-ons, access, RLS, or auth.