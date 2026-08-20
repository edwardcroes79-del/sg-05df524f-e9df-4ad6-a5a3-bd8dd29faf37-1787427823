---
title: Fix Dashboard Overview and Issue Stamp Routing and Search
status: in_progress
priority: urgent
type: bug
tags: [dashboard, routing, issue-stamp, rls, customers]
created_by: agent
created_at: 2026-08-20T16:00:00Z
position: 24
---

## Notes
- Dashboard Overview and Issue Stamp must load correctly on the first click.
- Verify `can_access_business` function is not unique error is completely gone.
- Issue Stamp customer search must work at the database level.
- Staff and Admin must both have proper access based on `business_users` or `businesses` owner.
- Do not use mock data. Stop and wait for instructions after fixing.

## Checklist
- [ ] Inspect `DashboardLayout.tsx` for routing issues (Overview and Issue Stamp links).
- [ ] Inspect `index.tsx` (Overview) for loading states and data fetching.
- [ ] Inspect `scan.tsx` (Issue Stamp) for loading states and customer search query.
- [ ] Verify `search_business_customers` RPC and `can_access_business` in the database.
- [ ] Fix business context resolution if it's causing infinite loading.
- [ ] Test the full Issue Stamp workflow.