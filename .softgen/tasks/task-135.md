---
title: Corporate locations management UI
status: in_progress
priority: urgent
type: bug
tags: [corporate-plan, locations, dashboard, ui]
created_by: agent
created_at: 2026-10-07T14:12:15Z
position: 135
---

## Notes
Fix only the missing Corporate Admin location management UI. The user reports Corporate phases are complete but no visible “Create Location” feature exists. First inspect the existing Corporate backend/location implementation and dashboard placement. Use the existing Phase 2 location architecture if present; do not create duplicate tables, APIs, or systems. Preserve Trial, Starter, Business, Professional pricing, limits, add-ons, Quick QR behavior, billing, and dashboard behavior. Corporate Admin must be able to view/create/edit/deactivate locations, view status, and select/switch active location. Location Managers/Staff must not receive Corporate Admin location-management permissions. Server-side/RLS enforcement must remain the source of truth.

## Checklist
- [ ] Inspect existing `business_locations` backend/table/API and confirm create/edit/deactivate support
- [ ] Inspect dashboard navigation/layout to determine where Corporate location management should appear
- [ ] Add Corporate-only Locations menu/section without exposing it to lower plans
- [ ] Add Corporate Admin UI for list, create, edit, deactivate, status, and active-location selection using real API data
- [ ] Preserve existing lower-plan behavior and avoid unrelated Corporate changes
- [ ] Validate with project checks and report files changed, backend found, security, database changes, and test results

## Acceptance
Corporate Admin sees a clear Locations section in the Business Dashboard and can manage real locations.
Lower-plan businesses do not see or access the Locations management UI.
No duplicate backend/database location system is created.