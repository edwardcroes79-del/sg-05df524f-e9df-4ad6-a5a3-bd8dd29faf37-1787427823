---
title: Excel Member Reconciliation Entitlement
status: done
priority: urgent
type: feature
tags: [billing, entitlements, reconciliation]
created_by: agent
created_at: 2026-10-14T17:07:23Z
position: 199
---

## Notes
Phase 4 adds a separate `bulk_member_removal` entitlement to the existing standard entitlement registry and seeds it for Corporate/Enterprise defaults through a migration. The runtime checks use saved `plan_entitlements`, so custom and duplicated plans follow stored configuration rather than hardcoded plan names.

## Checklist
- [x] Add `bulk_member_removal` to the standard entitlement definitions for Super Admin plan management
- [x] Add a focused migration to seed the entitlement for Corporate/Enterprise defaults only
- [x] Enforce server-side entitlement checks before reconciliation preview and confirmation
- [x] Preserve existing Excel export/import entitlements and behavior

## Acceptance
Super Admin can toggle bulk member removal through existing plan management, and reconciliation APIs reject businesses whose saved plan entitlement is disabled.