---
title: Spanish dashboard commerce pages
status: done
priority: high
type: feature
tags: [i18n, spanish, dashboard-commerce]
created_by: agent
created_at: 2026-09-30T16:27:55Z
position: 93
---

## Notes
Translated remaining Business Dashboard commerce/admin pages using the existing centralized i18n system. English remains default. Translation keys were added and wired for Billing, Add-ons, Staff, Settings, and related commerce/admin states. Business-created content, staff names, customer names, persisted plan/add-on names, payment IDs, transaction IDs, uploaded/configured values, and database content remain untranslated. Preserved billing, add-on request, plan change, staff invitation/removal, settings, permissions, auth, RLS, and all database logic. Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect Billing, Staff, and Settings pages
- [x] Convert Billing page forms, buttons, labels, add-ons, plan-change messages, payment proof states, and empty states to translation keys
- [x] Convert Staff page labels, invitations, permissions, buttons, empty states, confirmations, and toasts to translation keys
- [x] Convert Settings page business profile, branding, card customizer, form labels, validation, success/error messages, and actions to translation keys
- [x] Run project validation

## Acceptance
Billing, Add-ons, Staff, Settings, and Card Customizer dashboard text switches between English and Spanish.
Business-created names, staff/customer names, persisted plan/add-on names, transaction references, and uploaded values remain untranslated.
Existing billing, permissions, staff, and settings functionality remains unchanged.