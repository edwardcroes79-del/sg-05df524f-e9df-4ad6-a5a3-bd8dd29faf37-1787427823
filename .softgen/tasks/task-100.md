---
title: Papiamento reward label fix
status: in_progress
priority: high
type: bug
tags: [i18n, papiamento, navigation]
created_by: agent
created_at: 2026-10-01T00:48:36Z
position: 100
---

## Notes
Update only the existing Papiamento translation for the “Redeem Reward” function label from “Canjea recompensa” to exactly “Reclama premio”. This applies to the Business Dashboard menu label shown under “Stampnan y Recompensanan”. Do not change English or Spanish translations. Do not change routes, functionality, permissions, database, RLS, billing, or redemption logic. Use the existing i18n translation key rather than hard-coding a new string. Search for other occurrences of the same Papiamento UI label and keep the Papiamento label consistent where it represents the same function.

## Checklist
- [x] Locate the existing Papiamento i18n key for the Business Dashboard “Redeem Reward” label
- [x] Change only the Papiamento translation to “Reclama premio”
- [x] Search for matching Papiamento UI-label occurrences and update only the same label context
- [ ] Run project validation

## Acceptance
The Business Dashboard menu label for “Redeem Reward” displays “Reclama premio” when Papiamento is selected.
English and Spanish translations remain unchanged.
No underlying redemption functionality, route, permissions, database, or billing logic changes.