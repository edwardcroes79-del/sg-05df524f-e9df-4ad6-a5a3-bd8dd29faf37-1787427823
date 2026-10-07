---
title: Corporate staff location assignment backend
status: in_progress
priority: urgent
type: feature
tags: [corporate-plan, staff, locations, backend, security]
created_by: agent
created_at: 2026-10-07T14:24:02Z
position: 136
---

## Notes
Audit and implement Phase 1 backend only for Corporate staff-location assignment. Do not build UI in this phase. The required architecture is one staff account assigned to one or multiple Corporate locations, optional default/active location, Location Managers assigned to specific locations, Corporate Admin management only within own business, and server-side/RLS enforcement. Do not create duplicate staff accounts. Preserve historical location attribution. Do not change Trial, Starter, Business, Professional, pricing, limits, billing, Quick QR, Corporate Analytics, or existing Locations functionality.

## Checklist
- [x] Inspect live Supabase schema for staff/users, businesses, locations, staff-location relationships, RLS policies, and permission functions
- [x] Inspect existing staff APIs and location-management backend code
- [x] Determine whether `business_user_locations` relationship and assignment API already support assign, multi-assign, remove, default/active location, and Location Manager assignments
- [x] Implement missing backend/RLS/security support only if required by the audit
- [ ] Validate Corporate Admin-only assignment management, no self-assignment, no cross-business access, and assigned-location access restrictions
- [ ] Verify lower-plan behavior remains unchanged
- [ ] Run project checks and write final Phase 1 audit/backend report

## Acceptance
Corporate Admin can manage staff-location assignments through backend/API only within their own business.
Staff and Location Managers are restricted server-side to assigned locations.
No UI is built and no duplicate staff/location system is created.