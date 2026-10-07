---
title: Corporate staff location assignment backend
status: done
priority: urgent
type: feature
tags: [corporate-plan, staff, locations, backend, security]
created_by: agent
created_at: 2026-10-07T14:24:02Z
position: 136
---

## Notes
Phase 1 backend audit and implementation is complete. No UI was built. Existing architecture already included `business_locations`, `business_user_locations`, `business_users`, Corporate location APIs, staff-location assignment/removal/default-location support, and location attribution for historical activity. Missing backend support found and fixed: explicit `location_manager` assignment role support in `src/pages/api/staff/locations.ts`, and overly broad SELECT visibility for active business members in `business_locations` / `business_user_locations` RLS. RLS now restricts Staff and Location Managers to assigned locations/own assignment rows while preserving Corporate Admin and Super Admin access. Final report: `.softgen/corporate-staff-location-assignment-phase-1-audit.md`.

## Checklist
- [x] Inspect live Supabase schema for staff/users, businesses, locations, staff-location relationships, RLS policies, and permission functions
- [x] Inspect existing staff APIs and location-management backend code
- [x] Determine whether `business_user_locations` relationship and assignment API already support assign, multi-assign, remove, default/active location, and Location Manager assignments
- [x] Implement missing backend/RLS/security support only if required by the audit
- [x] Validate Corporate Admin-only assignment management, no self-assignment, no cross-business access, and assigned-location access restrictions
- [x] Verify lower-plan behavior remains unchanged
- [x] Run project checks and write final Phase 1 audit/backend report

## Acceptance
Corporate Admin can manage staff-location assignments through backend/API only within their own business.
Staff and Location Managers are restricted server-side to assigned locations.
No UI is built and no duplicate staff/location system is created.