---
title: Merchants Table JSX Compilation Fix
status: done
priority: urgent
type: bug
tags: [admin, merchants, jsx, billing]
created_by: agent
created_at: 2026-09-26T22:46:36Z
position: 63
---

## Notes
Fixed the JSX/compilation error in the Super Admin Merchants & Subscriptions table near the plan assignment select. Investigation confirmed the select JSX was structurally valid and the error was not caused by the `disabled` prop itself. The root cause was an incorrectly merged plan-assignment update: the table referenced `assigningPlanId` and `handlePlanAssignment`, but those were missing from the component. The fix added a single `assigningPlanId` state value and a `handlePlanAssignment` wrapper that preserves the existing `handleChangePlan` logic while providing the loading/disabled state. A leftover unsupported Lucide `title` prop on the add-on cancel indicator was also replaced with a wrapper `title` attribute. Temporary repair files from the prior syntax-repair attempt were removed. Plan price, active add-ons, add-on total, total subscription, and all merchant actions remain in place. Project validation passed with no CSS, linting, type checking, or server errors.

## Checklist
- [x] Inspect `assigningPlanId` state and `handlePlanAssignment`
- [x] Inspect the complete merchants table row JSX around the select
- [x] Identify the actual root cause before editing
- [x] Fix the malformed JSX or state issue without removing functionality
- [x] Run project validation
- [x] Confirm the merchant financial overview remains intact

## Acceptance
The project builds without JSX/TypeScript errors.
The plan dropdown renders with dynamic plans and disables during assignment.
The merchants table still shows plan price, active add-ons, add-on total, and total subscription.