---
title: Corporate location selector consolidation
status: in_progress
priority: high
type: bug
tags: [corporate, analytics, location-selector, i18n]
created_by: agent
created_at: 2026-10-08T12:37:27Z
position: 148
---

## Notes
Remove the duplicate location selector from Advanced Analytics while keeping the global top-right dashboard location selector as the single source of truth. Advanced Analytics must automatically use the global active location for data requests, refresh when it changes, and keep date range plus refresh controls. Do not change pricing, plan limits, billing, entitlements, Quick QR functionality, customer data, staff permissions, location management, or existing translations except verifying the remaining global location selector labels.

## Checklist
- [x] Inspect the global dashboard location selector state/context and Advanced Analytics local selector state
- [x] Remove only the duplicate Advanced Analytics location dropdown
- [x] Ensure Advanced Analytics requests use the global active location id
- [x] Ensure changing the global selector automatically refetches Advanced Analytics data
- [x] Keep Corporate-wide/all-locations behavior through the existing active-location architecture
- [ ] Verify global location selector labels resolve in English, Spanish, and Papiamento
- [ ] Run validation and targeted checks

## Acceptance
Advanced Analytics has no second location dropdown.
Changing the top-right global location selector changes the actual Advanced Analytics request location id and data scope.
The global location selector remains translated in English, Spanish, and Papiamento.