---
title: Papiamento i18n foundation
status: in_progress
priority: high
type: feature
tags: [i18n, papiamento, language-selector]
created_by: agent
created_at: 2026-10-01T00:04:50Z
position: 95
---

## Notes
Add Papiamento as a third language to the existing i18n system. Use the exact language name “Papiamento” everywhere and never “Papiamentu”. English remains the default language and Spanish remains available. Reuse the existing centralized translation-key system and persisted language selection. Prepare Papiamento coverage for the existing UI without translating user-created, business-created, customer-created, or database content. Do not change database, RLS, permissions, billing, authentication, or existing functionality.

## Checklist
- [ ] Add Papiamento to the existing language registry
- [ ] Add Papiamento labels to the language selector translation keys
- [ ] Prepare a complete Papiamento translation catalog using the existing translation keys
- [ ] Add Papiamento to the existing language selector UI
- [ ] Verify language persistence continues to work through the existing provider
- [ ] Run project validation

## Acceptance
Users can select English, Spanish, or Papiamento from the existing language selector.
The selected Papiamento language persists after refresh/login through the existing i18n provider.
No database, RLS, permissions, billing, or existing app functionality is changed.