---
title: Corporate analytics backend
status: in_progress
priority: urgent
type: feature
tags: [corporate-plan, analytics, backend, security]
created_by: agent
created_at: 2026-10-07T13:47:05Z
position: 132
---

## Notes
Implement Phase 3 Corporate-only Advanced Analytics backend using real production data and the Phase 2 multi-location architecture. Trial, Starter, Business, Professional, existing analytics, pricing, limits, billing, add-ons, permissions, Quick QR behavior, and dashboard behavior must remain unchanged. Enforce Corporate Advanced Analytics server-side through the existing entitlement/plan architecture; UI hiding is not sufficient. Analytics must use server-side aggregation and must not load whole customer/stamp/reward tables into the browser.

## Checklist
- [ ] Refresh live Supabase schema and inspect current analytics/dashboard access paths
- [ ] Add server-side Corporate analytics access enforcement through `advanced_analytics` entitlement
- [ ] Build authenticated analytics API with date filters, location filters, Corporate-wide view, and assigned-location scoping
- [ ] Aggregate real metrics for customers, stamps, rewards, redemptions, programs, locations, Quick QR, cross-location activity, and trends
- [ ] Add only necessary performance indexes for analytics queries
- [ ] Validate lower-plan users cannot access Corporate analytics
- [ ] Validate metrics against direct database counts

## Acceptance
Corporate Advanced Analytics API returns real aggregated data only for entitled Corporate businesses.
Lower plans receive no Corporate Analytics access.
Location Managers and Staff only receive allowed location-scoped analytics.