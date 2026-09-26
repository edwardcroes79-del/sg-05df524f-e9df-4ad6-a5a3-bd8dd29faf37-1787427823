---
title: Business Activation Workflow Fix
status: in_progress
priority: urgent
type: bug
tags: [admin, merchants, activation, rls]
created_by: agent
created_at: 2026-09-26T23:46:32Z
position: 68
---

## Notes
Fix the Super Admin Merchants & Subscriptions Activate workflow where a suspended business remains suspended after clicking Activate. Trace the complete flow: frontend button, handler, API/RPC/database update, authorization/RLS, triggers, refresh, and displayed status. Do not change only the UI badge. Preserve approval/subscription/trial data, plan assignments, entitlements, and existing Suspend behavior. Verify the actual database row changes from suspended to active and that the UI refreshes accordingly.

## Checklist
- [ ] Inspect Activate/Suspend button rendering and frontend handler
- [ ] Inspect any API/RPC/database function involved in business activation
- [ ] Inspect businesses schema fields for status, subscription, trial, approval, suspension fields
- [ ] Inspect RLS/policies/triggers that may block or revert activation
- [ ] Identify root cause before editing
- [ ] Apply minimal fix using existing merchant status architecture
- [ ] Verify suspended to active database transition
- [ ] Verify active to suspended and back to active still works
- [ ] Verify trial/subscription/plan data remains unchanged
- [ ] Run project validation

## Acceptance
A suspended business becomes active in the actual database after Super Admin activation.
The Merchants & Subscriptions UI refreshes and shows ACTIVE after activation.
Suspending and reactivating preserves plan, trial, subscription, and entitlement data.