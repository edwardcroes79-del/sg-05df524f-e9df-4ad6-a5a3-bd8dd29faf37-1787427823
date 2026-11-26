---
title: Staff management loyalty card assignment UI
status: in_progress
priority: high
type: feature
tags: [staff, dashboard, loyalty-cards]
created_by: agent
created_at: 2026-11-26T11:03:45Z
position: 308
---
## Notes
Add a Loyalty Card Assignment section to Staff Management so business admins can assign multiple active loyalty cards to each staff account, review current assignments, and update them without rebuilding staff management. Reuse existing dashboard data where possible and keep the UI aligned with the current Royalty Stamp admin design.

Implemented scope:
- Added `src/components/dashboard/StaffLoyaltyCardAssignments.tsx` to manage multi-card assignment for active staff accounts.
- Embedded the new section into `src/pages/dashboard/staff.tsx`.
- Added active loyalty-card loading, current-assignment badges, checkbox-based multi-select editing, and immediate save behavior.
- Updated `src/pages/dashboard/quick-stamp-qr.tsx` so staff users only see assigned loyalty cards and get the required no-assignment message when none are assigned.

## Checklist
- [x] Inspect the existing Staff Management page structure and available loyalty-card data sources
- [x] Add a Loyalty Card Assignment section to Staff Management
- [x] Allow selecting one or multiple active loyalty cards per staff member
- [x] Show current assignments for each staff member and allow editing/removal without rebuilding the page
- [x] Restrict Quick Issue Stamp to assigned cards only for staff
- [ ] Restrict normal Issue Stamp to assigned cards only for staff
- [ ] Validate build/runtime behavior after all affected surfaces are updated

## Acceptance
Business admins can assign multiple loyalty cards to each staff member from Staff Management.
Staff can only see assigned loyalty cards in Quick Issue Stamp.
Different staff members can share the same loyalty card.