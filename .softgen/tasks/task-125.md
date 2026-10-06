---
title: Super Admin mobile scrolling
status: in_progress
priority: urgent
type: bug
tags: [admin, mobile, layout, scrolling]
created_by: agent
created_at: 2026-10-06T02:43:57Z
position: 125
---

## Notes
Fix the Super Admin navigation/page scrolling issue on mobile. Merchants & Subscriptions and Backups currently scroll correctly, but other sections such as Subscription Plans & Limits, Customer Capacity Add-ons, Customers, Payment Settings, Website Settings, Account Security, and other Super Admin sections can become trapped or stop scrolling vertically. Must identify the root cause, make the smallest safe layout fix, preserve desktop layout and selected-section behavior, avoid hiding overflow, avoid fixed heights that cut off content, and avoid changes to database logic, permissions, RLS, authentication, backup logic, or unrelated functionality. Must verify every Super Admin section opens, scrolls top-to-bottom and back, and can navigate to another section without scroll lock on mobile/Android/Samsung Browser behavior.

## Checklist
- [ ] Inspect Super Admin responsive layout, selected-section rendering, mobile navigation, and overflow/height/flex containers
- [ ] Identify the exact root cause of mobile scroll trapping for affected sections
- [ ] Apply the smallest safe layout fix so every Super Admin section can scroll vertically on mobile
- [ ] Preserve desktop scrolling/layout and existing navigation/selected-section behavior
- [ ] Test all Super Admin sections for top-to-bottom scrolling and section switching behavior
- [ ] Run project validation
- [ ] Report root cause, files changed, and testing performed

## Acceptance
Every Super Admin section can scroll from top to bottom on mobile without trapped content.
Desktop Super Admin layout remains unchanged.
Navigation between Super Admin sections does not lock or break scrolling.