---
title: Papiamento redeem wording fix
status: done
priority: high
type: bug
tags: [i18n, papiamento, rewards]
created_by: agent
created_at: 2026-10-01T01:37:00Z
position: 102
---

## Notes
Updated the existing Papiamento translation for the Redeem Reward wording. Changed “Canjea” to exactly “Reclama” where it refers to redeeming a reward in Papiamento UI text. English and Spanish translations were not changed. Updated existing i18n translation keys only, not hard-coded UI text. Searched occurrences and replaced Papiamento reward-redemption wording only where it refers to redeeming/redeemed rewards. No functionality, routes, permissions, database, billing, or redemption logic was changed. Project validation passed with no CSS, linting, TypeScript, or server errors.

## Checklist
- [x] Locate Papiamento i18n keys containing the old redeem wording
- [x] Replace reward-redeem wording with exactly “Reclama”
- [x] Preserve English, Spanish, database, routes, permissions, and redemption logic unchanged
- [x] Run project validation

## Acceptance
Papiamento reward redemption UI uses “Reclama” for redeem wording.
English and Spanish translations remain unchanged.
No redemption functionality, route, permission, database, or billing logic changes.