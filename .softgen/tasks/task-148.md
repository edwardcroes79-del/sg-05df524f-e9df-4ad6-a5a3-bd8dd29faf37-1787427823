---
title: Corporate location selector consolidation
status: done
priority: high
type: bug
tags: [corporate, analytics, location-selector, i18n]
created_by: agent
created_at: 2026-10-08T12:37:27Z
position: 148
---

## Notes
Removed the duplicate location selector from Advanced Analytics while keeping the global top-right dashboard location selector as the single source of truth. Advanced Analytics now uses the global active location for data requests, refreshes when that active location changes, and keeps only the date range plus refresh controls. No pricing, plan limits, billing, entitlements, Quick QR functionality, customer data, staff permissions, or location management logic was changed.

Root cause:
- Advanced Analytics still had its own local location dropdown and wrote to its own location scope while the dashboard header already maintained the active Corporate location.
- This created two controls for the same concept and made the UX unclear.

Changes made:
- Kept the global top-right dashboard location selector.
- Removed the duplicate Advanced Analytics location dropdown.
- Replaced the removed dropdown with an informational active-location display.
- Preserved Corporate-wide/all-locations scope through the global selector.
- Advanced Analytics continues to include the active `location_id` in analytics requests when the global active location is not `all`.
- Changing the global selector dispatches the existing active-location event and Advanced Analytics refetches from that single source of truth.

Validation results:
- Translation check passed for `dashboard.locationSwitcher.label` and `dashboard.analytics.corporateWide` in English, Spanish, and Papiamento.
- Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect the global dashboard location selector state/context and Advanced Analytics local selector state
- [x] Remove only the duplicate Advanced Analytics location dropdown
- [x] Ensure Advanced Analytics requests use the global active location id
- [x] Ensure changing the global selector automatically refetches Advanced Analytics data
- [x] Keep Corporate-wide/all-locations behavior through the existing active-location architecture
- [x] Verify global location selector labels resolve in English, Spanish, and Papiamento
- [x] Run validation and targeted checks

## Acceptance
Advanced Analytics has no second location dropdown.
Changing the top-right global location selector changes the actual Advanced Analytics request location id and data scope.
The global location selector remains translated in English, Spanish, and Papiamento.