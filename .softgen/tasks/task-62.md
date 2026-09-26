---
title: Super Admin Merchant Financial Overview
status: done
priority: medium
type: feature
tags: [admin, merchants, billing, ui]
created_by: agent
created_at: 2026-09-26T22:35:00Z
position: 62
---

## Notes
Updated the Super Admin "Merchants & Subscriptions" screen to provide a quick financial overview of each Business subscription. The table now shows Plan Price, Active Add-ons, Add-on Total, and Total Subscription amount. It calculates the add-on total by summing active add-ons (excluding pending/cancelled) and displays the final recurring amount (Plan + Add-ons). This works dynamically with database-driven plans and add-ons without N+1 queries.

## Checklist
- [x] Open `src/pages/admin/index.tsx` to inspect the merchants table.
- [x] Add columns for Plan Price, Active Add-ons, Add-on Total, and Total Subscription.
- [x] Calculate active add-on totals for each business from the `businessAddonSubscriptions` array.
- [x] Display the calculated financial breakdown in the table row.
- [x] Ensure pending and cancelled add-ons are excluded from active totals.
- [x] Maintain existing table actions (Suspend, Delete, Plan selection).
- [x] Run checks and verify no linting errors.

## Acceptance
Super Admin Merchants & Subscriptions table prominently displays Plan Price, Active Add-ons list, Add-on Total, and Total Subscription.
Pending/cancelled add-ons do not inflate the active subscription totals.
All existing merchant actions continue to work flawlessly.