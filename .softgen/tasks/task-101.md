---
title: Papiamento business terminology fix
status: in_progress
priority: high
type: bug
tags: [i18n, papiamento, terminology]
created_by: agent
created_at: 2026-10-01T01:26:30Z
position: 101
---

## Notes
Correct the existing Papiamento translation for the Business Name field from “Nomber di negocio” to exactly “Nomber di negoshi”. Use “negoshi” for the Papiamento word for business and do not use “negocio” in Papiamento where it refers to business. Do not change Spanish, English, database, functionality, permissions, routes, or other languages. Update the existing i18n translation keys only and search for other Papiamento occurrences of “negocio” that refer to business.

## Checklist
- [x] Locate the Papiamento i18n key for the Business Name field
- [x] Change “Nomber di negocio” to “Nomber di negoshi”
- [x] Search Papiamento translations for “negocio” and correct business-context occurrences to “negoshi”
- [x] Preserve Spanish, English, database, functionality, permissions, and routes unchanged
- [ ] Run project validation

## Acceptance
The Papiamento Business Name field shows “Nomber di negoshi”.
Papiamento UI no longer uses “negocio” where it means business.
Spanish and English translations remain unchanged.