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
Fix only the missing Corporate Admin location management UI. The existing backend already has `business_locations`, `business_user_locations`, `loyalty_program_locations`, nullable location attribution, RLS policies, and `/api/business/locations` for list/create/edit/deactivate. Inspection found the visible Business Dashboard location management UI was missing. Inspection also found the existing create endpoint did not write the required `business_locations.slug` field, so creating a real location from UI would fail against the live schema. The fix uses the existing Phase 2 location architecture and does not create duplicate tables, APIs, or location systems.

## Checklist
- [x] Inspect existing `business_locations` backend/table/API and confirm create/edit/deactivate support
- [x] Inspect dashboard navigation/layout to determine where Corporate location management should appear
- [x] Add Corporate-only Locations menu/section without exposing it to lower plans
- [x] Add Corporate Admin UI for list, create, edit, deactivate, status, and active-location selection using real API data
- [x] Preserve existing lower-plan behavior and avoid unrelated Corporate changes
- [ ] Validate with project checks and report files changed, backend found, security, database changes, and test results

## Acceptance
Corporate Admin sees a clear Locations section in the Business Dashboard and can manage real locations.
Lower-plan businesses do not see or access the Locations management UI.
No duplicate backend/database location system is created.