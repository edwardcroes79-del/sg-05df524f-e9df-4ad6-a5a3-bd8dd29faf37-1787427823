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
Fix the Super Admin Merchants & Subscriptions Activate workflow where a suspended business remains suspended after clicking Activate. Root cause identified in `src/pages/admin/index.tsx`: the row button computed `newStatus` and passed it to `handleToggleBusinessStatus`, but that handler expects the current status and toggles internally. For a suspended business, the button passed `"active"`, then the handler interpreted it as current active status and saved `"suspended"` again. The fix passes `biz.status` directly to the existing handler. This preserves the existing direct Supabase update path, RLS architecture, plan assignment, trial fields, subscription fields, and Suspend behavior.

## Checklist
- [x] Inspect Activate/Suspend button rendering and frontend handler
- [x] Inspect any API/RPC/database function involved in business activation
- [x] Inspect businesses schema fields for status, subscription, trial, approval, suspension fields
- [x] Inspect RLS/policies/triggers that may block or revert activation
- [x] Identify root cause before editing
- [x] Apply minimal fix using existing merchant status architecture
- [ ] Verify suspended to active database transition
- [ ] Verify active to suspended and back to active still works
- [ ] Verify trial/subscription/plan data remains unchanged
- [ ] Run project validation

## Acceptance
A suspended business becomes active in the actual database after Super Admin activation.
The Merchants & Subscriptions UI refreshes and shows ACTIVE after activation.
Suspending and reactivating preserves plan, trial, subscription, and entitlement data.