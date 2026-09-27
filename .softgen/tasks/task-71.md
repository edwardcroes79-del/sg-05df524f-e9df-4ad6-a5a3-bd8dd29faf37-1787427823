---
title: Super Admin Plan Assignment Regression Fix
status: in_progress
priority: urgent
type: bug
tags: [admin, subscription-plans, merchants, regression]
created_by: agent
created_at: 2026-09-27T03:45:11Z
position: 71
---

## Notes
Fix the regression in Super Admin → Merchants & Subscriptions where plan assignment is broken or missing after the approval workflow fix. Do not modify the working approval workflow, approval email workflow, or Suspend/Activate behavior. Investigate the existing plan select, `plans` loading, `handlePlanAssignment`, `assigningPlanId`, business subscription fields, row rendering conditions, add-on totals, and Supabase updates. Restore the original dynamic plan assignment behavior using active database plans, including custom plans, while preserving trial data and active add-ons.

## Checklist
- [ ] Inspect merchant row plan dropdown and conditional rendering
- [ ] Inspect `plans` state/query and active/custom plan support
- [ ] Inspect `handlePlanAssignment` and assignment loading state
- [ ] Verify business subscription fields and add-on totals used by the row
- [ ] Identify the root cause before editing
- [ ] Apply the smallest safe fix without touching approval/email/Suspend/Activate logic
- [ ] Verify database plan assignment changes persist after refresh
- [ ] Verify plan price and total subscription update while add-ons remain intact
- [ ] Verify approval and Suspend/Activate still work
- [ ] Run project validation

## Acceptance
Approved businesses show a working dynamic plan dropdown.
Changing the plan updates the actual database and persists after refresh.
Plan price, limits, total subscription, and active add-ons remain correct.
Approval, approval email, Suspend, and Activate workflows remain unchanged.