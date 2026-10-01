---
title: Papiamento i18n foundation
status: done
priority: high
type: feature
tags: [i18n, papiamento, language-selector]
created_by: agent
created_at: 2026-10-01T00:04:50Z
position: 95
---

## Notes
Added Papiamento as a third language to the existing i18n system. Used the exact language name “Papiamento” everywhere and avoided the non-Aruban language-name variant. English remains the default language and Spanish remains available. Reused the existing centralized translation-key system and persisted language selection. Prepared Papiamento coverage through the existing translation catalog by providing a Papiamento catalog for every existing UI key, with English fallback coverage for untranslated foundation keys and Papiamento overrides for core selector, navigation, auth, dashboard, and admin shell text. User-created, business-created, customer-created, and database content remains untranslated. No database, RLS, permissions, billing, authentication, or existing functionality was changed. Project validation passed with no CSS, linting, TypeScript, or server errors.

Changed files:
- `src/lib/i18n.ts`: added `pa: "Papiamento"`, selector keys, and complete typed Papiamento catalog coverage.
- `src/components/LanguageSelector.tsx`: added Papiamento as a selectable language option.
- `src/contexts/I18nProvider.tsx`: restored persisted Papiamento selections through the existing language registry.

## Checklist
- [x] Add Papiamento to the existing language registry
- [x] Add Papiamento labels to the language selector translation keys
- [x] Prepare a complete Papiamento translation catalog using the existing translation keys
- [x] Add Papiamento to the existing language selector UI
- [x] Verify language persistence continues to work through the existing provider
- [x] Run project validation

## Acceptance
Users can select English, Spanish, or Papiamento from the existing language selector.
The selected Papiamento language persists after refresh/login through the existing i18n provider.
No database, RLS, permissions, billing, or existing app functionality is changed.