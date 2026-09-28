---
title: Contract Expiration Reminder Automation
status: in_progress
priority: urgent
type: feature
tags: [contracts, reminders, notifications, email]
created_by: agent
created_at: 2026-09-28T11:38:01Z
position: 76
---

## Notes
Build Phase 4 contract reminders using the existing Phase 1–3 contract system. Send reminders 30, 14, 7, and 1 day before expiration, plus one notification on expiration. Notify Business Admin and Super Admin through the existing notification/email architecture. Do not create a duplicate email/notification system. Track each reminder once per contract period so repeated scheduled processing does not create duplicate reminders. If a contract is renewed, reminders must follow the new contract end date and old-period reminders must stop. Use server-side scheduled processing, actual stored contract dates, and existing system timezone. Do not change billing, plans, add-ons, contract access logic, RLS, business isolation, or permissions.

## Checklist
- [ ] Inspect existing notification, email, contract, and scheduled-job architecture
- [ ] Add reminder tracking for each business contract period and reminder type
- [ ] Add server-side reminder processor for 30, 14, 7, 1 day, and expiration reminders
- [ ] Notify Business Admin using existing notification/email architecture
- [ ] Notify Super Admin using existing notification/email architecture
- [ ] Prevent duplicate reminders when the processor runs repeatedly
- [ ] Ensure renewed contracts use the new contract end date and old-period reminders stop
- [ ] Preserve existing contract access, billing, plans, add-ons, auth, RLS, and business isolation
- [ ] Test all reminder intervals, renewal behavior, duplicate prevention, and expiration notification
- [ ] Run project validation

## Acceptance
Contract reminders are sent once per interval per contract period through existing notification/email systems.
Renewed contracts stop old-period reminders and use the new stored contract end date.
Billing, plans, add-ons, and contract access enforcement remain unchanged.