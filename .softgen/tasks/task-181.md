---
title: Safe Plan Deletion
status: in_progress
priority: high
type: feature
tags: [admin, plans, safety]
created_by: agent
created_at: 2026-10-13T17:21:41Z
position: 181
---

## Notes
Add a safe Delete Plan action in Super Admin → Subscription Plans & Limits. Only authorized Super Admins may delete a plan, and only when backend checks confirm the plan has never been used. Must inspect relevant references before deleting, including businesses assigned to the plan, subscription/payment records, trial assignments, billing references, and other plan-dependent data. Do not rely on frontend counts. Do not cascade-delete businesses, subscriptions, customers, payments, historical records, billing records, or subscriptions. Duplicate plans must follow the same eligibility rules. If usage cannot be reliably determined, deletion must be blocked. Do not change pricing, subscription limits, billing behavior, dashboard entitlements, auth, RLS, or deployment state.

## Checklist
- [ ] Inspect existing plan API, Super Admin plan UI, and plan reference usage across code/database tables
- [ ] Add server-side delete handling with Super Admin authorization and backend eligibility checks immediately before deletion
- [ ] Block deletion when any protected business, subscription, trial, billing, or historical record references the plan
- [ ] Add confirmation dialog and Delete Plan action for eligible/attempted plans with loading, success, error, and refresh behavior
- [ ] Verify duplicate plan deletion does not affect its source plan and failed deletion leaves data intact
- [ ] Run static checks and report modified files, database migration requirements, limitations, and manual tests

## Acceptance
A Super Admin can delete an unused plan after explicit confirmation. Any plan with current or historical references is blocked with a clear error. Source plans, subscriptions, customer data, pricing, limits, billing, auth, RLS, and entitlements are not modified.