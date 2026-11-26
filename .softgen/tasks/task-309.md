---
title: Staff stamping card selection restrictions
status: todo
priority: high
type: feature
tags: [staff, stamping, dashboard, quick-stamp]
created_by: agent
created_at: 2026-11-26T11:03:45Z
position: 309
---
## Notes
Restrict staff-facing stamping surfaces so staff only see and use loyalty cards assigned to them. Preserve Business Admin and Super Admin behavior. If a staff member has one assigned card, auto-select it. If multiple cards are assigned, allow switching only among assigned cards. If none are assigned, show a clear blocked state.

## Checklist
- [ ] Inspect normal Issue Stamp and Quick Issue Stamp card-loading logic
- [ ] Filter staff-visible loyalty cards to assigned cards only
- [ ] Auto-select a single assigned card and allow switching among multiple assigned cards
- [ ] Show the no-assignment empty state for staff with no assigned cards
- [ ] Preserve existing business-admin and super-admin access behavior
- [ ] Validate that the selected card is clearly identified before issuing a stamp

## Acceptance
Staff only see assigned loyalty cards on stamping surfaces.
Staff with no assignments see a clear message and cannot issue stamps.
Quick Issue Stamp and normal Issue Stamp both respect assignments.