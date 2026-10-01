---
title: Aruban Papiamento translation
status: in_progress
priority: high
type: feature
tags: [i18n, papiamento, aruba, translation]
created_by: agent
created_at: 2026-10-01T00:13:55Z
position: 96
---

## Notes
Review and correct the existing Papiamento translations using authentic Aruban Papiamento. Do not use Curaçao/Bonaire Papiamentu spelling or vocabulary. Use the exact language name “Papiamento” everywhere. Translate all remaining static UI into natural, professional Aruban Papiamento through the existing translation-key system only. Include Customer, Business, Staff, Super Admin, login/register, navigation, loyalty programs, stamps/rewards, QR, billing, settings, notifications, forms, errors, loading states, empty states, and confirmations. Mandatory separate What’s New pass: titles, descriptions, NEW badges, buttons, labels, categories, and empty states must be translated via keys. Do not translate user-created, business-created, customer-created, or database content. Do not change functionality, database, RLS, permissions, billing, or app logic. First pass replaced non-Aruban spellings such as “Kliente/Kargando/Konfigurá” with Aruban forms like “cliente/cargando/configura” and translated customer, auth, dashboard navigation/status, overview, loyalty program, QR, Quick Stamp, and mandatory What’s New keys.

## Checklist
- [x] Inspect the existing i18n catalog and current Papiamento foundation
- [x] Replace Curaçao/Bonaire-style spellings and partial fallback entries with authentic Aruban Papiamento
- [ ] Translate Business Dashboard, Staff, Billing, Settings, QR, loyalty, stamps, rewards, and notifications keys
- [x] Translate Customer app, loyalty cards, rewards, activity, profile, settings, PWA, and empty states keys
- [ ] Translate auth/login/register/reset/update password and Super Admin keys
- [x] Fully translate What’s New keys, including titles, descriptions, NEW badges, buttons, labels, categories, and empty states
- [x] Preserve user/business/customer-created and database content unchanged
- [ ] Run project validation

## Acceptance
Papiamento selection shows authentic Aruban Papiamento across audited static UI.
What’s New is fully translated through Papiamento keys with no hard-coded English in its static text.
Existing functionality, database, RLS, permissions, and billing behavior remain unchanged.