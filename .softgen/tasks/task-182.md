---
title: Duplicated Corporate Entitlement Access
status: in_progress
priority: high
type: bug
tags: [plans, entitlements, dashboard, authorization]
created_by: agent
created_at: 2026-10-13T17:35:47Z
position: 182
---

## Notes
Investigate and fix why businesses assigned to a duplicated Corporate subscription plan do not receive the Corporate dashboard and feature experience. Scope includes tracing subscription plan records, plan_entitlements, dashboard UI visibility, and backend authorization. Do not change prices, limits, existing plan assignments, existing subscriptions, feature assignments, customer data, auth, RLS, destructive migrations, or deployment state. Root-cause report must precede implementation. Existing evidence from the previous duplication task noted hardcoded `mega_plan` checks in dashboard surfaces; this task must verify exact code paths before changing them and then migrate safe checks to entitlement-driven access where supported.

## Checklist
- [ ] Inspect dashboard UI visibility and backend authorization for hardcoded plan IDs, plan names, or tier checks
- [ ] Inspect duplicate-plan copy behavior and confirm entitlements are saved independently for duplicates
- [ ] Identify the root cause and proposed smallest safe changes before implementation
- [ ] Replace supported hardcoded Corporate access checks with configured entitlement checks without granting lower-tier plans unauthorized access
- [ ] Verify existing businesses/subscriptions are not modified and duplicated plan behavior follows saved entitlements
- [ ] Run available checks and report modified files, database migrations, tests, and remaining limitations

## Acceptance
A duplicated Corporate plan with copied Corporate entitlements receives the same configured Corporate dashboard features and backend-authorized access as Corporate. Editing the duplicate does not change Corporate. Existing lower-tier plans remain restricted unless their saved entitlements allow access.