---
title: Merchants Table JSX Compilation Fix
status: in_progress
priority: urgent
type: bug
tags: [admin, merchants, jsx, billing]
created_by: agent
created_at: 2026-09-26T22:46:36Z
position: 63
---

## Notes
Fix the current JSX/compilation error in the Super Admin Merchants & Subscriptions table near the plan assignment select. Investigation confirmed the complete select JSX is structurally valid and the error is not caused by the `disabled` prop itself. The actual root cause is an incorrectly merged plan-assignment update: the table now references `assigningPlanId` and `handlePlanAssignment`, but neither existed in the component. The existing function is named `handleChangePlan`. The fix adds a single `assigningPlanId` state value and a `handlePlanAssignment` wrapper that preserves the existing assignment logic while providing the loading/disabled state. Plan price, active add-ons, add-on total, total subscription, and all merchant actions remain in place.

## Checklist
- [x] Inspect `assigningPlanId` state and `handlePlanAssignment`
- [x] Inspect the complete merchants table row JSX around the select
- [x] Identify the actual root cause before editing
- [x] Fix the malformed JSX or state issue without removing functionality
- [ ] Run project validation
- [ ] Confirm the merchant financial overview remains intact

## Acceptance
The project builds without JSX/TypeScript errors.
The plan dropdown renders with dynamic plans and disables during assignment.
The merchants table still shows plan price, active add-ons, add-on total, and total subscription.