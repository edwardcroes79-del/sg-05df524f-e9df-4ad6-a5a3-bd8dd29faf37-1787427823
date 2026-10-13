---
title: Plan Limit Display Consistency
status: in_progress
priority: high
type: bug
tags: [homepage, admin, pricing, plans]
created_by: agent
created_at: 2026-10-13T16:22:09Z
position: 178
---

## Notes
Investigate and fix the mismatch where Super Admin shows the Free 14-Day Trial member/customer limit as 49 customers while the homepage card shows 50 loyalty members. Scope is plan configuration and homepage display consistency only. Inspection found the Super Admin plan table displays `plan.max_customers` and `plan.max_loyalty_programs` from the database-backed `/api/admin/plans` result, while the homepage formatter was overriding those same limits with hardcoded marketing values in `getHomepageDisplayLimits`. The smallest safe fix is to use the database-backed `subscription_plans.max_loyalty_programs` and `subscription_plans.max_customers` values for homepage loyalty limits, while preserving only the requested homepage staff-account display overrides. Do not change prices, trial duration, feature entitlements, subscription enforcement, billing, existing customer records, staff limits, permissions, authentication, RLS, or deployment state. No database changes were made.

## Checklist
- [x] Inspect homepage pricing-card implementation and Super Admin subscription-plan display/API
- [x] Identify the authoritative plan record and why Free Trial differs between Super Admin and homepage
- [x] Apply the smallest safe consistency fix without changing backend enforcement, prices, billing, staff limits, or permissions
- [x] Check other plans for the same hardcoded-vs-configured limit inconsistency
- [ ] Run available checks and report root cause, modified files, database changes, and manual tests

## Acceptance
Super Admin and homepage display the same configured Free 14-Day Trial customer/member limit. Other plan-limit discrepancies are identified or corrected safely. No backend subscription enforcement, billing, authentication, RLS, staff permissions, or existing customer records are changed.