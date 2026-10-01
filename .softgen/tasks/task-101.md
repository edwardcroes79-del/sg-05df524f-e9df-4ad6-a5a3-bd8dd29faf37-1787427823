---
title: Papiamento business terminology fix
status: done
priority: high
type: bug
tags: [i18n, papiamento, terminology]
created_by: agent
created_at: 2026-10-01T01:27:52Z
position: 101
---

## Notes
Corrected the existing Papiamento translation for the Business Name field to exactly “Nomber di negoshi”. Updated Papiamento business-context terminology to use “negoshi” and “negoshinan” through the existing i18n translation keys only. Spanish and English translations were not changed. Database, functionality, permissions, routes, billing, and other languages were not changed. Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Locate the Papiamento i18n key for the Business Name field
- [x] Change the Business Name field to “Nomber di negoshi”
- [x] Search Papiamento translations for the Spanish business term and correct business-context occurrences to “negoshi”
- [x] Preserve Spanish, English, database, functionality, permissions, and routes unchanged
- [x] Run project validation

## Acceptance
The Papiamento Business Name field shows “Nomber di negoshi”.
Papiamento UI uses “negoshi” where it means business.
Spanish and English translations remain unchanged.