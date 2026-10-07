---
title: Corporate translation audit and fix
status: in_progress
priority: urgent
type: bug
tags: [corporate-plan, i18n, translations, ui]
created_by: agent
created_at: 2026-10-07T16:24:48Z
position: 141
---

## Notes
Audit and fix all newly created or modified Corporate build UI text so English, Spanish, and Papiamento are supported through the existing i18n system only. Scope includes Corporate Dashboard, Locations, Create/Edit Location, location management, location selector/switcher, Staff → Location Assignment, Location Manager functionality, Corporate Advanced Analytics and filters/charts/cards, Corporate Quick QR and location selection, Corporate branding/settings, dialogs, forms, loading/empty/error/success states, menus, and tooltips. Do not change business logic, database architecture, pricing, limits, billing, permissions, Quick QR behavior, loyalty programs, or customer functionality.

## Checklist
- [ ] Audit Corporate pages/components/menus/modals for hardcoded user-facing strings
- [ ] Add or complete English, Spanish, and Papiamento keys in the existing i18n system
- [ ] Replace hardcoded Corporate UI strings with existing i18n lookups
- [ ] Verify nested dialogs/forms/loading/empty/error/success states use translations
- [ ] Preserve business logic and existing lower-plan behavior
- [ ] Run project checks and record final translation audit report

## Acceptance
All newly created or modified Corporate UI text uses the existing i18n system.
Every new Corporate translation key has English, Spanish, and Papiamento values.
No unexpected English text remains on newly created Corporate pages when Spanish or Papiamento is selected.