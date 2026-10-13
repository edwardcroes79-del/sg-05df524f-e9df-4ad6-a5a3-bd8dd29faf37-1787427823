---
title: Subscription Plan Visibility Schema Cache Fix
status: in_progress
priority: urgent
type: bug
tags: [plans, visibility, database, schema]
created_by: agent
created_at: 2026-10-13T19:19:34Z
position: 190
---

## Notes
Investigate and fix the urgent schema error after adding the Super Admin “Show on Homepage” toggle: `Could not find the 'visibility' column of 'subscription_plans' in the schema cache`. Scope includes inspecting the actual live `subscription_plans` schema response, migration status, Super Admin create/update frontend payload, admin plans API payload, homepage public query, and generated Supabase typing integration. Use one consistent field across database, frontend, backend, and public queries. If a column is missing, apply a safe non-destructive migration with default public visibility so existing plans remain visible. Preserve existing plan IDs, prices, limits, entitlements, subscriptions, assignments, RLS, authorization, and deployment state. Do not remove the toggle, disable RLS, perform destructive changes, or deploy automatically.

## Checklist
- [ ] Inspect actual `subscription_plans` schema/cache behavior and migration status
- [ ] Inspect frontend create/edit payloads and backend API writes for `visibility`
- [ ] Apply the smallest safe schema/code fix using one consistent field name and type
- [ ] Verify saving existing visible/hidden plans and creating visible/hidden plans is supported
- [ ] Verify homepage filters visible plans while Super Admin can still manage and assign hidden plans
- [ ] Run checks and report root cause, migration applied/required, files changed, and test results

## Acceptance
Saving subscription plans with “Show on Homepage” enabled or disabled no longer fails with a schema-cache error. Existing plans remain visible by default. Hidden plans disappear from public pricing while staying manageable and assignable in Super Admin.