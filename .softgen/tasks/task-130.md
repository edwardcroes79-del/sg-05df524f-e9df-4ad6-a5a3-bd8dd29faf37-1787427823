---
title: Corporate location backend APIs
status: todo
priority: high
type: feature
tags: [corporate-plan, locations, api, staff]
created_by: agent
created_at: 2026-10-07T13:28:34Z
position: 130
---

## Notes
Build backend API/service surfaces for Corporate location management only after the database foundation exists. Preserve existing staff creation, billing, authentication, RLS, and lower-plan behavior. Corporate Admin can manage all locations; Location Managers and Staff are restricted to assigned locations. Staff can have multiple locations and one default/active location.

## Checklist
- [x] Add authenticated location management API for create/edit/deactivate/list using server-side Corporate entitlement and location limit checks
- [x] Add staff-location assignment API for assign/remove/default location with audit logging
- [x] Preserve existing staff creation behavior for all current plans
- [x] Ensure Location Manager and Staff access is enforced server-side, not only in UI
- [x] Add safe service helpers for listing accessible locations without loading unrelated tenant data
- [ ] Validate Super Admin/business isolation and lower-plan regression behavior

## Acceptance
Corporate Admin can manage locations and staff-location assignments through secure backend endpoints.
Location Manager/Staff authorization is enforced server-side by assigned locations.
Existing non-Corporate staff and billing behavior remains unchanged.