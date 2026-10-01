---
title: Aruban Papiamento translation
status: done
priority: high
type: feature
tags: [i18n, papiamento, aruba, translation]
created_by: agent
created_at: 2026-10-01T00:13:55Z
position: 96
---

## Notes
Reviewed and corrected the existing Papiamento translations using authentic Aruban Papiamento. Avoided Curaçao/Bonaire Papiamentu spelling and vocabulary and used the exact language name “Papiamento” everywhere. Translated remaining static UI through the existing translation-key system only, including Customer, Business, Staff, Super Admin, login/register, navigation, loyalty programs, stamps/rewards, QR, billing, settings, notifications, forms, errors, loading states, empty states, and confirmations. Mandatory What’s New pass was completed: titles, descriptions, NEW badges, buttons, labels, categories, and empty states are translated via keys. User-created, business-created, customer-created, and database content remains untranslated. No functionality, database, RLS, permissions, billing, or app logic was changed. Replaced non-Aruban spellings such as “Kliente/Kargando/Konfigurá” with Aruban forms like “cliente/cargando/configura”. Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Inspect the existing i18n catalog and current Papiamento foundation
- [x] Replace Curaçao/Bonaire-style spellings and partial fallback entries with authentic Aruban Papiamento
- [x] Translate Business Dashboard, Staff, Billing, Settings, QR, loyalty, stamps, rewards, and notifications keys
- [x] Translate Customer app, loyalty cards, rewards, activity, profile, settings, PWA, and empty states keys
- [x] Translate auth/login/register/reset/update password and Super Admin keys
- [x] Fully translate What’s New keys, including titles, descriptions, NEW badges, buttons, labels, categories, and empty states
- [x] Preserve user/business/customer-created and database content unchanged
- [x] Run project validation

## Acceptance
Papiamento selection shows authentic Aruban Papiamento across audited static UI.
What’s New is fully translated through Papiamento keys with no hard-coded English in its static text.
Existing functionality, database, RLS, permissions, and billing behavior remain unchanged.