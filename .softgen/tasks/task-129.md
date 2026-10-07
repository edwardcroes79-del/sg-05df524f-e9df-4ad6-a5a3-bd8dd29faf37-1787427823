---
title: Corporate multi-location database
status: in_progress
priority: urgent
type: feature
tags: [corporate-plan, database, rls, locations]
created_by: agent
created_at: 2026-10-07T13:28:34Z
position: 129
---

## Notes
Implement Phase 2 Corporate-only backend foundation from the approved Phase 1 audit. Use existing Corporate plan `mega_plan`; do not change Trial, Starter, Business, Professional, lower-plan pricing, limits, add-ons, Quick QR behavior, billing behavior, customer behavior, loyalty behavior, permissions, or existing non-Corporate flows. Add location schema, Corporate entitlements, RLS/security helpers, audit hooks, and location attribution columns while preserving current data and existing QR/stamp/reward behavior.

## Checklist
- [x] Refresh live Supabase schema before database changes
- [x] Add Corporate-only entitlements for `mega_plan`: `quick_stamp_qr`, `advanced_analytics`, `max_locations`
- [x] Add `business_locations`, `business_user_locations`, and `loyalty_program_locations` with RLS, constraints, indexes, and audit fields
- [x] Add nullable location attribution columns to stamp, reward, and QR tables without breaking historical rows
- [x] Add SECURITY DEFINER helpers for Corporate admin, location access, location management, stamp access, and program-location availability
- [x] Ensure RLS preserves business isolation, customer isolation, Super Admin access, and lower-plan behavior
- [x] Generate updated Supabase types after schema changes
- [ ] Validate no existing lower-plan limits/prices/add-ons are modified

## Acceptance
Corporate has secure location-capable backend schema and entitlements.
Existing plans and lower-plan Quick QR add-on behavior remain unchanged.
Historical non-location data remains valid through nullable location attribution.