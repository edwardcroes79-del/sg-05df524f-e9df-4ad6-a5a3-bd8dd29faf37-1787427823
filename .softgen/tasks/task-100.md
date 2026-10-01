---
title: Papiamento reward label fix
status: done
priority: high
type: bug
tags: [i18n, papiamento, rewards]
created_by: agent
created_at: 2026-10-01T00:49:50Z
position: 100
---

## Notes
Updated the existing Papiamento translation only. Changed the Business Dashboard “Redeem Reward” label and matching Papiamento UI-label contexts from “Canjea recompensa” to exactly “Reclama premio”. English and Spanish translations were not changed. No underlying functionality, route, permissions, database, billing, or redemption logic was changed. The fix was made through the existing i18n translation keys in `src/lib/i18n.ts`, including the Business Dashboard menu under “Stampnan y Recompensanan”. Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Locate the existing Papiamento i18n key for the Business Dashboard “Redeem Reward” label
- [x] Change only the Papiamento translation to “Reclama premio”
- [x] Search for matching Papiamento UI-label occurrences and update only the same label context
- [x] Run project validation

## Acceptance
The Papiamento Business Dashboard menu shows “Reclama premio” for the Redeem Reward function.
English and Spanish labels remain unchanged.
No underlying redemption functionality, route, permissions, database, or billing logic changes.