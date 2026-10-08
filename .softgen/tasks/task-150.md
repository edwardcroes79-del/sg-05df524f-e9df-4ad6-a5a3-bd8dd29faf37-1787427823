---
title: Papiamento terminology cleanup
status: in_progress
priority: urgent
type: chore
tags: [i18n, papiamento, terminology]
created_by: agent
created_at: 2026-10-08T13:49:43Z
position: 150
---

## Notes
Update only Papiamento translations in the existing i18n system. Do not change English, Spanish, translation keys, variable names, database values, business logic, analytics calculations, or Quick QR functionality. Required replacements: “Tasa di canje” → “Tarifa di redenshon”, “Sellos” → “Stempel”, “Finalización” → “Completa”, “Ganadas” → “Gana”, “Canjeadas” → “Reclama”. Quick QR Analytics Papiamento description must be exactly: “Actividat di Corporate cu Quick QR inclui, basa riba tokennan real i transaccion di stempel.”

## Checklist
- [ ] Inspect the existing i18n dictionary and locate all Papiamento entries using the old terminology
- [ ] Update only Papiamento translation values for dashboard, loyalty programs, analytics, corporate, reports, cards, tables, modals, and customer-facing text
- [ ] Replace the Quick QR Analytics Papiamento description with the exact required wording
- [ ] Search the application for the old Papiamento terminology and verify no intended user-facing translation values still use it
- [ ] Run project error checks to confirm functionality and other locales remain unchanged

## Acceptance
Papiamento UI consistently uses the required terminology across the app.
English and Spanish translations are not modified.
Quick QR Analytics Papiamento description matches the exact requested sentence.