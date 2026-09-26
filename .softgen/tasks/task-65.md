---
title: Add Available Add-ons Announcement
status: done
priority: medium
type: feature
tags: [dashboard, ui, announcements]
created_by: agent
created_at: 2026-09-26T23:03:00Z
position: 65
---

## Notes
Add a new feature announcement for "Available Add-ons" in the Business Dashboard's What's New section. It must be marked as "NEW", not "Coming Soon". Include highlights like Add More Customers, Keep Your Current Plan, Flexible Growth, and Simple Approval. List the available capacity options (+100, +250, +500, +1,000 Customers) without hardcoding prices. Use the existing UI component and styling. Do not modify any backend or billing functionality.

## Checklist
- [x] Locate the What's New section in `DashboardLayout.tsx`.
- [x] Add the Available Add-ons announcement block with the required text and highlights.
- [x] Ensure it uses the "NEW" badge and styling matching the existing "Reward Expiration" announcement.
- [x] Verify no pricing or actual billing functionality was altered.
- [x] Run project validation.

## Acceptance
The "Available Add-ons" announcement is visible in the What's New section.
It accurately lists the highlights and available customer options.
No other announcements or functionalities are affected.