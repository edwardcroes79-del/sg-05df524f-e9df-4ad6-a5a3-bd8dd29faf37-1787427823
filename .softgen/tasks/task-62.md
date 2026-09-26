---
title: Super Admin Merchant Financial Overview
status: in_progress
priority: medium
type: feature
tags: [admin, merchants, billing, ui]
created_by: agent
created_at: 2026-09-26T22:35:00Z
position: 62
---

## Notes
Update the Super Admin "Merchants & Subscriptions" screen to provide a quick financial overview of each Business subscription. The table should show Plan Price, Active Add-ons, Add-on Total, and Total Subscription amount. It should calculate the add-on total by summing active add-ons (excluding pending/cancelled) and display the final recurring amount (Plan + Add-ons). Make sure this works dynamically with database-driven plans and add-ons, avoiding N+1 queries by leveraging existing data arrays fetched in the Super Admin dashboard.

## Checklist
- [ ] Open `src/pages/admin/index.tsx` to inspect the merchants table.
- [ ] Add columns for Plan Price, Active Add-ons, Add-on Total, and Total Subscription.
- [ ] Calculate active add-on totals for each business from the `businessAddonSubscriptions` array.
- [ ] Display the calculated financial breakdown in the table row.
- [ ] Ensure pending and cancelled add-ons are excluded from active totals.
- [ ] Maintain existing table actions (Suspend, Delete, Plan selection).
- [ ] Run checks and verify no linting errors.

## Acceptance
Super Admin Merchants & Subscriptions table prominently displays Plan Price, Active Add-ons list, Add-on Total, and Total Subscription.
Pending/cancelled add-ons do not inflate the active subscription totals.
All existing merchant actions continue to work flawlessly.