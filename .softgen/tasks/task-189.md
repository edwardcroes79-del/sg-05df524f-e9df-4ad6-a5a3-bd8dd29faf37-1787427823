---
title: Private Subscription Plan Visibility
status: in_progress
priority: high
type: feature
tags: [plans, homepage, admin, visibility]
created_by: agent
created_at: 2026-10-13T19:10:45Z
position: 189
---

## Notes
Add a Super Admin setting named “Show on Homepage” for subscription plans. Existing plans must keep current public visibility by default. Visible plans appear in public homepage pricing cards and public signup/selection lists. Hidden plans remain active, manageable in Super Admin, assignable through admin subscription assignment workflows, and retain all configured entitlements/limits for assigned businesses. Do not change prices, limits, feature entitlements, existing assignments, subscriptions, authorization, RLS, or deployment state. Public APIs and frontend queries must filter by the visibility field instead of hiding with CSS. Live schema inspection showed `subscription_plans.visibility` was not present yet (`42703`), so a new non-destructive migration adds `visibility text not null default 'public'` with a public/private check constraint. This preserves current public visibility for existing plans. Implementation uses `visibility = "public"` for Show on Homepage enabled and `visibility = "private"` for hidden/private plans. Public homepage pricing filters at the Supabase query layer by `visibility = "public"` after the migration is applied, with a temporary non-breaking fallback for environments where the migration has not run yet.

## Checklist
- [x] Inspect subscription plan schema, Super Admin plan form/API, homepage pricing source, and public signup/plan-selection paths
- [x] Add persistent visibility field with existing plans defaulting to current public visibility
- [x] Add Show on Homepage toggle to create/edit/duplicate plan flows without changing entitlement behavior
- [x] Filter homepage pricing cards and public plan-selection/signup lists by the visibility setting
- [ ] Preserve Super Admin visibility/assignment of hidden plans and assigned-business entitlements
- [ ] Run checks and report modified files, migrations, and test results

## Acceptance
Visible plans remain public. Hidden plans disappear from public pricing/signup lists but remain manageable and assignable by Super Admin. Businesses assigned to hidden plans keep the configured permissions and limits.