---
title: Birthday Rewards Stage B3 Celebration Activity
status: todo
priority: high
type: feature
tags: [birthday-rewards, stage-b, customer-ui, celebration]
created_by: agent
created_at: 2026-10-26T02:50:48Z
position: 239
---

## Notes
Implement in-app birthday celebration discovery from committed successful birthday award ledger rows only. Use celebration_seen_at acknowledgement. Do not send email, SMS, push, or external notifications. Update customer activity so birthday_bonus is displayed as a bonus stamp rather than a redeemed reward.

## Checklist
- [ ] Add customer celebration API for unseen awarded birthday bonuses scoped to the authenticated customer
- [ ] Add idempotent acknowledgement endpoint updating only celebration_seen_at
- [ ] Add customer layout celebration modal/banner with business name, "1 bonus stamp awarded", View My Card, and dismiss
- [ ] Update customer activity display for stamp_type birthday_bonus
- [ ] Verify refreshing, dismissing, or reopening the app never issues stamps

## Acceptance
Customers see each committed birthday bonus celebration once and birthday_bonus activity is classified correctly.