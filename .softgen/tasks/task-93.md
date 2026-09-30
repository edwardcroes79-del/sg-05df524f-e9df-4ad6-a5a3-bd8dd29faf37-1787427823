---
title: Spanish dashboard commerce pages
status: todo
priority: high
type: feature
tags: [i18n, spanish, billing]
created_by: agent
created_at: 2026-09-30T16:27:53Z
position: 93
---

## Notes
Translate Business Dashboard commerce and administration pages using the existing centralized i18n system. Scope includes Billing, Add-ons, contract information, subscription states, payment request UI messages, Staff, Settings, forms, buttons, labels, empty states, confirmations, success/error/validation messages. English remains default. Use translation keys only. Do not modify billing, plan, add-on, subscription, contract, auth, RLS, permissions, or payment logic.

## Checklist
- [ ] Inspect billing, staff, and settings pages
- [ ] Add missing English and Spanish translation keys for commerce/admin UI copy
- [ ] Replace hardcoded UI copy with translation keys while preserving persisted plan/add-on/business data values
- [ ] Validate affected pages compile and existing actions still work

## Acceptance
Billing, add-ons, contract information, staff, and settings UI switch between English and Spanish.
Persisted plan/add-on/business data remains unchanged and untranslated.
Existing billing, permissions, staff, and settings functionality remains unchanged.