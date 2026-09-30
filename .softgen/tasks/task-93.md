---
title: Spanish dashboard commerce pages
status: in_progress
priority: high
type: feature
tags: [i18n, spanish, dashboard-commerce]
created_by: agent
created_at: 2026-09-30T16:27:55Z
position: 93
---

## Notes
Translate remaining Business Dashboard commerce/admin pages using the existing centralized i18n system. English remains default. Use translation keys only. Do not translate business-created content, staff names, customer names, plan/add-on names from persisted database rows, payment IDs, transaction IDs, or uploaded/configured values. Preserve billing, add-on request, plan change, staff invitation/removal, settings, permissions, auth, RLS, and all database logic.

## Checklist
- [x] Inspect Billing, Staff, and Settings pages
- [x] Convert Billing page forms, buttons, labels, add-ons, plan-change messages, payment proof states, and empty states to translation keys
- [x] Convert Staff page labels, invitations, permissions, buttons, empty states, confirmations, and toasts to translation keys
- [x] Convert Settings page business profile, branding, card customizer, form labels, validation, success/error messages, and actions to translation keys
- [ ] Run project validation

## Acceptance
Billing, Add-ons, Staff, Settings, and Card Customizer dashboard text switches between English and Spanish.
Business-created names, staff/customer names, persisted plan/add-on names, transaction references, and uploaded values remain untranslated.
Existing billing, permissions, staff, and settings functionality remains unchanged.