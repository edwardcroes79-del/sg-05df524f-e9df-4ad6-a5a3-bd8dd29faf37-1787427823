---
title: Super Admin Plan Assignment Regression Fix
status: done
priority: urgent
type: bug
tags: [admin, subscriptions, plans, regression]
created_by: agent
created_at: 2026-09-27T03:42:00Z
position: 71
---

## Notes
Restored the Super Admin Merchants & Subscriptions plan assignment dropdown without changing the working approval workflow, approval email workflow, or Suspend/Activate behavior. Investigation found the merchant row had regressed to static plan text, so Super Admin could no longer change a business plan from the table. The Plan column now renders a database-driven dropdown populated from active subscription plans loaded through the existing secure Super Admin plans API, while preserving the currently assigned plan if it is inactive/archived. The existing `handlePlanAssignment` and `handleChangePlan` flow remains in use. Database regression confirmed Super Admin-context plan updates change `businesses.subscription_plan`, preserve business status, preserve active add-ons, and keep subscription totals calculated from plan price plus active add-ons. Project validation passed.

## Checklist
- [x] Inspect existing plan dropdown, plans query, assignment handler, and assigning state
- [x] Inspect business subscription fields and active add-on total calculation
- [x] Identify the plan assignment regression without modifying approval workflow
- [x] Restore dynamic plan dropdown using active database plans, including custom plans
- [x] Preserve active add-ons and subscription total calculation
- [x] Verify database plan assignment with Super Admin context
- [x] Verify approval, approval email, Suspend, and Activate workflows remain untouched
- [x] Run project validation

## Acceptance
Super Admin can assign active database plans from the Merchants & Subscriptions table.
Plan price, add-ons, add-on total, and subscription total remain correct.
Approval, approval email, Suspend, and Activate workflows remain unchanged.