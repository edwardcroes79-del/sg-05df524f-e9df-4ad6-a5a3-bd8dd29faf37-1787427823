---
title: Corporate staff location assignment UI
status: in_progress
priority: urgent
type: feature
tags: [corporate-plan, staff, locations, ui, i18n]
created_by: agent
created_at: 2026-10-07T14:32:51Z
position: 137
---

## Notes
Build the actual Corporate Admin Staff → Location Assignment functionality using the existing Phase 1 backend/RLS architecture. Do not create duplicate staff accounts, duplicate location tables, duplicate assignment APIs, or a second location system. Corporate Admin must assign existing staff to one or multiple locations, remove assignments, set default/active locations, and assign location-manager role to authorized locations. Staff and Location Managers must remain restricted server-side to assigned locations. Add a location switcher if the existing Corporate architecture needs active-location selection. All new UI text must use the existing i18n system in English, Spanish, and Papiamento. Do not change Trial, Starter, Business, Professional, pricing, limits, billing, Quick QR, Corporate Analytics, or existing Locations functionality.

## Checklist
- [ ] Inspect existing Staff Management, Locations page, staff-location API response shape, DashboardLayout active-location behavior, and i18n structure
- [ ] Add Corporate Admin assignment interface showing staff name, role, assigned locations, default location, assign/remove/default actions
- [ ] Support assignment to multiple locations and per-location `staff` / `location_manager` roles through the existing API
- [ ] Add authorized active-location switcher if needed, with Corporate Admin seeing all locations and staff seeing assigned locations only
- [ ] Add English, Spanish, and Papiamento translations for all new user-facing UI
- [ ] Preserve lower-plan behavior and avoid unrelated Corporate changes
- [ ] Validate with project checks and write final implementation report

## Acceptance
Corporate Admin can assign and remove existing staff across Corporate locations without duplicate staff accounts.
Staff and Location Managers can only select/access assigned locations, with server-side enforcement preserved.
All new UI text supports English, Spanish, and Papiamento.