---
title: Papiamento redeem wording fix
status: in_progress
priority: high
type: bug
tags: [i18n, papiamento, rewards]
created_by: agent
created_at: 2026-10-01T01:36:45Z
position: 102
---

## Notes
Update the existing Papiamento translation for the Redeem Reward wording. Change “Canjea” to exactly “Reclama” where it refers to redeeming a reward. Do not change English or Spanish translations. Update existing i18n translation keys only, not hard-coded UI text. Search other Papiamento occurrences of “Canjea” and replace them with “Reclama” only where they refer to redeeming a reward. Do not change functionality, routes, permissions, database, billing, or redemption logic.

## Checklist
- [x] Locate Papiamento i18n keys containing the old redeem wording
- [x] Replace reward-redeem wording with exactly “Reclama”
- [x] Preserve English, Spanish, database, routes, permissions, and redemption logic unchanged
- [ ] Run project validation

## Acceptance
Papiamento Redeem Reward wording uses “Reclama”.
English and Spanish translations remain unchanged.
No redemption functionality, route, permission, database, or billing logic changes.