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
Fix the current JSX/compilation error in the Super Admin Merchants & Subscriptions table near the plan assignment select. Do not remove the `disabled={assigningPlanId === biz.id}` behavior and do not remove `assigningPlanId` functionality. Inspect the complete select element, surrounding JSX, `assigningPlanId` state, `handlePlanAssignment`, plans state, and recent financial overview changes. Preserve plan price, active add-ons, add-on total, total subscription, and all existing merchant actions.

## Checklist
- [ ] Inspect `assigningPlanId` state and `handlePlanAssignment`
- [ ] Inspect the complete merchants table row JSX around the select
- [ ] Identify the actual root cause before editing
- [ ] Fix the malformed JSX or state issue without removing functionality
- [ ] Run project validation
- [ ] Confirm the merchant financial overview remains intact

## Acceptance
The project builds without JSX/TypeScript errors.
The plan dropdown renders with dynamic plans and disables during assignment.
The merchants table still shows plan price, active add-ons, add-on total, and total subscription.