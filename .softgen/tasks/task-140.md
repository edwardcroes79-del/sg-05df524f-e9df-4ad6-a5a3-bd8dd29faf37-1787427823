---
title: Corporate analytics selected location filter
status: in_progress
priority: urgent
type: bug
tags: [corporate-plan, analytics, locations, security]
created_by: agent
created_at: 2026-10-07T15:04:13Z
position: 140
---

## Notes
Fix only the Corporate Advanced Analytics selected-location scoping bug. When a Corporate Admin switches active location, Advanced Analytics must pass the selected location into the real backend/database analytics queries and refresh all location-scoped analytics sections. Preserve Corporate-wide analytics if it exists. Do not change Trial, Starter, Business, Professional, pricing, limits, billing, Quick QR entitlement, or loyalty functionality. Do not create mock data or duplicate analytics/location systems. Security must validate business_id + location_id server-side and preserve RLS/business isolation.

## Checklist
- [x] Inspect active-location state/storage, Advanced Analytics page fetch flow, backend analytics API/RPCs, cache dependencies, and location security checks
- [x] Identify why changing selected location does not trigger location-scoped analytics queries
- [x] Pass selected location into backend analytics requests and include it in fetch/cache dependencies
- [x] Update backend analytics queries/RPC calls to scope all applicable metrics by validated location_id while preserving Corporate-wide view
- [x] Validate unauthorized location requests are rejected server-side
- [ ] Run project checks and report root cause, files changed, query/cache/security changes, analytics sections fixed, and test results

## Acceptance
Selecting Location A shows Location A analytics, selecting Location B refreshes to Location B analytics, and switching back restores Location A values.
Corporate-wide analytics remains available if already supported.
Unauthorized or cross-business location analytics requests are rejected server-side.