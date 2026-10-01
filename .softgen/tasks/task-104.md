---
title: Branding and card customizer translations
status: done
priority: high
type: bug
tags: [i18n, branding, card-customizer, papiamento]
created_by: agent
created_at: 2026-10-01T16:14:55Z
position: 104
---

## Notes
Fixed translation gaps in the Branding & Card Customizer using the existing i18n system only. Translated static UI into English, Spanish, and authentic Aruban Papiamento, including page title/description, tabs, template selection headings/descriptions, filters, template names/descriptions/badges/locked labels, live preview/realtime sync, card labels, buttons, tooltips, validation, errors, empty states, and remaining static customizer text. Used https://papiamento.aw as the primary reference target for Aruban Papiamento where accessible. Used “Papiamento” everywhere and verified the non-Aruban language-name variant is absent. Preserved business-created program names, descriptions, and reward content without automatic translation. Did not change template availability, plan restrictions, card designs, saving logic, database, permissions, routes, billing, or functionality. Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Locate the Branding & Card Customizer implementation
- [x] Inspect existing i18n catalog and Customizer hard-coded text
- [x] Add English, Spanish, and Aruban Papiamento translation keys for Customizer static UI
- [x] Replace Customizer hard-coded static text with i18n keys
- [x] Preserve business-created program names, descriptions, and reward content
- [x] Verify forbidden language-name variant is absent
- [x] Run project validation

## Acceptance
Branding & Card Customizer static UI changes immediately between English, Spanish, and Papiamento.
Business-created program names, descriptions, and reward content are not automatically translated.
Template availability, plan restrictions, card designs, saving logic, and unrelated functionality remain unchanged.