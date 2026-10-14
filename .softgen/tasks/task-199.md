---
title: Excel Member Reconciliation Entitlement
status: in_progress
priority: urgent
type: feature
tags: [entitlements, billing, excel, reconciliation]
created_by: agent
created_at: 2026-10-14T16:58:09Z
position: 199
---

## Notes
Implement Phase 4 entitlement gate for Excel Member Reconciliation. Inspect actual plan entitlement schema and current plan configuration first. Add separate `bulk_member_removal` entitlement only if the existing entitlement model supports it. Corporate and Enterprise should be enabled by default only after verifying current plan records; custom and duplicated plans must follow their saved entitlements, not hardcoded plan names. Super Admin plan management must be able to toggle the entitlement through existing plan management. Server-side enforcement must require authentication, active Owner role via existing `resolveBusinessForUser()`, entitlement, and business isolation before service-role data access.

## Checklist
- [ ] Inspect plan entitlement schema, plan management API/UI, and current Excel entitlement patterns
- [ ] Verify whether Corporate and Enterprise defaults can be seeded safely without hardcoding runtime checks
- [ ] Add `bulk_member_removal` entitlement to existing entitlement definitions/configuration
- [ ] Ensure Super Admin plan management can view and toggle the entitlement
- [ ] Enforce entitlement server-side before reconciliation preview and confirmation

## Acceptance
Owners on entitled plans can access reconciliation APIs. Non-entitled plans and unauthorized staff are rejected server-side. Custom and duplicated plans use saved entitlements.