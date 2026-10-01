---
title: Branding and card customizer translations
status: in_progress
priority: high
type: bug
tags: [i18n, branding, card-customizer, papiamento]
created_by: agent
created_at: 2026-10-01T16:14:55Z
position: 104
---

## Notes
Fix translation gaps in the Branding & Card Customizer using the existing i18n system only. Translate static UI into English, Spanish, and authentic Aruban Papiamento, including page title/description, tabs, template selection headings/descriptions, filters, template names/descriptions/badges/locked labels, live preview/realtime sync, card labels, buttons, tooltips, validation, errors, empty states, and remaining static customizer text. Use https://papiamento.aw as the primary reference target for Aruban Papiamento where accessible. Use “Papiamento” everywhere and never the non-Aruban language-name variant. Preserve business-created program names, descriptions, and reward content without automatic translation. Do not change template availability, plan restrictions, card designs, saving logic, database, permissions, routes, billing, or functionality.

## Checklist
- [ ] Locate the Branding & Card Customizer implementation and current i18n usage
- [ ] Add missing English, Spanish, and Aruban Papiamento translation keys
- [ ] Replace hard-coded static Customizer text with existing i18n key lookups
- [ ] Preserve business-created program/reward content as untranslated user data
- [ ] Verify language switching updates the full Customizer immediately
- [ ] Run project validation

## Acceptance
Branding & Card Customizer static UI changes immediately between English, Spanish, and Papiamento.
Business-created program names, descriptions, and reward content are not automatically translated.
Template availability, plan restrictions, card designs, saving logic, and unrelated functionality remain unchanged.