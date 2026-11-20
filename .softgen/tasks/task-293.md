---
title: Plan change request label correction
status: in_progress
priority: high
type: bug
tags: [billing, dashboard, plans, admin]
created_by: agent
created_at: 2026-11-20T16:37:16Z
position: 293
---
## Notes
Correct the existing pending plan-change request label so Business Admins see Upgrade Request or Downgrade Request based on the relationship between the current active plan and the requested plan. Reuse the current approval workflow and plan metadata. Do not change pricing, entitlements, payment processing, or approval mechanics. Update both the main Business Admin dashboard and any related request detail surface that shows the pending request type.

## Checklist
- [x] Inspect the current plan-change request UI and any shared helpers that derive pending request labels
- [x] Classify plan changes dynamically using existing configured plan hierarchy or actual plan pricing
- [x] Update Business Admin dashboard pending request messaging to show Upgrade Request or Downgrade Request correctly
- [x] Update any related request detail view that shows the same request classification
- [ ] Verify upgrade and downgrade scenarios without changing approval workflow or entitlements

## Acceptance
A pending move from the free trial to Starter displays Upgrade Request: Pending Super Admin Approval.
A pending move to a lower plan displays Downgrade Request: Pending Super Admin Approval.
Existing pending approval behavior and current-plan entitlements remain unchanged until approval.