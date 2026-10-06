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

Root cause identified: the Super Admin route used a plain document/body scroll layout while long tab sections include wide tables, wrapped tab triggers, cards, and nested flex/table containers. On mobile browsers, especially Samsung Browser, selected tab content could become the effective touch target/scroll container even though it did not own a reliable vertical scroll area. Wide table content also forced horizontal overflow inside the page, increasing the chance of vertical scroll gestures being trapped. Backups and Merchants appeared usable because their content had stronger natural page height and horizontal table behavior, while other selected sections could stop scrolling before lower forms/buttons.

Fix in progress: added a mobile-safe Super Admin scroll root using dynamic viewport height, explicit `min-h-0` flex containment for the tabs area, horizontal containment for the tab list, and horizontal containment around the wide Merchants table without hiding vertical overflow or using a fixed cut-off height.

## Checklist
- [x] Inspect Super Admin responsive layout, selected-section rendering, mobile navigation, and overflow/height/flex containers
- [x] Identify the exact root cause of mobile scroll trapping for affected sections
- [x] Apply the smallest safe layout fix so every Super Admin section can scroll vertically on mobile
- [x] Preserve desktop scrolling/layout and existing navigation/selected-section behavior
- [ ] Test all Super Admin sections for top-to-bottom scrolling and section switching behavior
- [ ] Run project validation
- [ ] Report root cause, files changed, and testing performed

## Acceptance
Every Super Admin section can scroll from top to bottom on mobile without trapped content.
Desktop Super Admin layout remains unchanged.
Navigation between Super Admin sections does not lock or break scrolling.