---
title: Super Admin Plan Duplication
status: in_progress
priority: high
type: feature
tags: [admin, plans, entitlements]
created_by: agent
created_at: 2026-10-13T17:16:25Z
position: 180
---

## Notes
Add a Duplicate Plan action to Super Admin → Subscription Plans & Limits. Scope is plan-management UI/API only. Duplicate an existing plan into a new independently editable plan with a unique name, copied configurable fields, copied feature entitlements, and a new database ID. Do not copy subscriptions, runtime data, payment-provider identifiers, customer records, transaction history, or usage counters. Do not change existing plan values, existing subscriptions, homepage pricing behavior except through the existing public plan system, authentication, RLS, billing, stamp issuance, rewards, or member-management behavior. Inspected existing plan create/edit workflow, secure admin API authorization, shared entitlement definitions, schema-backed plan fields, homepage formatter, and dashboard feature access logic. The duplicate UI reuses the existing plan form, clearly identifies the source plan, leaves the new name blank so the Super Admin must enter a unique name, copies configurable limits/features/entitlements, and saves through the existing Super Admin-only `/api/admin/plans` route. Server-side validation now enforces unique plan names and rolls back a newly inserted plan if entitlement persistence fails. Dashboard limitation found: `DashboardLayout` still has hardcoded `mega_plan` checks for several Corporate dashboard surfaces, so duplicated plans with equivalent entitlements may not receive every dashboard surface until those checks are migrated to entitlement-driven access.

## Checklist
- [x] Inspect Super Admin plan create/edit UI, admin plan API, shared entitlement definitions, and dashboard entitlement usage
- [x] Identify valid reusable plan fields and fields that must not be copied
- [x] Add Duplicate Plan UI with source-plan context, editable copied fields, unique-name validation, feature entitlement controls, Cancel, and Create Duplicate actions
- [x] Add secure server-side duplicate handling that authorizes Super Admins, validates input, creates a new plan ID, copies entitlements, and avoids partial creation
- [x] Verify copied entitlements persist independently and existing plans/subscriptions remain unchanged
- [ ] Run static checks and report changed files, checks, and dashboard-mapping limitations

## Acceptance
A Super Admin can duplicate an existing plan into a new uniquely named plan with copied configurable limits and entitlements. The duplicate has its own ID and can be edited independently. Existing subscriptions and source plans are not modified.