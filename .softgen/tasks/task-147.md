---
title: Corporate Advanced Analytics location filter fix
status: in_progress
priority: urgent
type: bug
tags: [corporate, analytics, locations, i18n, security]
created_by: agent
created_at: 2026-10-08T12:12:04Z
position: 147
---

## Notes
Fix the Corporate Advanced Analytics bug where changing the location selector updates the visible selected location but does not change the actual analytics data.

Scope is limited to Advanced Analytics location filtering and dynamic insight translations. Do not modify Trial, Starter, Business, Professional, pricing, plan limits, billing, Quick QR entitlement, customer data, loyalty functionality, authentication, or unrelated Corporate features.

Audit required before changing implementation:
- Trace selected location state into analytics request/query/cache key.
- Verify whether `location_id` is passed to API/RPC.
- Verify whether backend Supabase queries filter by `location_id`.
- Verify location authorization and business isolation are enforced server-side.
- Verify RLS/policies for location-scoped analytics tables.
- Inspect dynamic Royalty Insights messages and move them to the existing i18n system with English, Spanish, and Papiamento coverage.

## Checklist
- [ ] Inspect Advanced Analytics page and location selector state flow
- [ ] Inspect business analytics API/RPC/database queries
- [ ] Verify live schema, RLS, and relevant analytics/location functions
- [ ] Identify why selected `location_id` does not affect returned metrics
- [ ] Pass selected `location_id` into the real analytics request/query path where missing
- [ ] Add backend location filtering and authorization if backend ignores `location_id`
- [ ] Fix cache/refetch dependencies so changing location fetches fresh analytics
- [ ] Add i18n keys for dynamic Advanced Analytics insight messages in English, Spanish, and Papiamento
- [ ] Verify Corporate-wide/all-locations aggregation remains available if present
- [ ] Test Location A → Location B → Location A with real database records
- [ ] Test refresh behavior while Location B is selected
- [ ] Run project validation
- [ ] Report root cause, data flow, backend/API/RPC changes, query/cache changes, RLS/security, translations, and real test results

## Acceptance
Selecting Location A returns Location A analytics, selecting Location B returns Location B analytics, and switching back to Location A restores Location A analytics using real database data.
Analytics metrics, trends, program performance, Quick QR activity, and insights are scoped to the selected location when a location is selected.
Dynamic Advanced Analytics insight messages use the existing i18n system in English, Spanish, and Papiamento without hardcoded user-facing text.