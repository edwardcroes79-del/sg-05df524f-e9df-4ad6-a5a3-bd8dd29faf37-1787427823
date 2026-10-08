---
title: Super Admin translation regression fix
status: in_progress
priority: urgent
type: bug
tags: [i18n, super-admin, runtime-regression]
created_by: agent
created_at: 2026-10-08T11:29:36Z
position: 145
---

## Notes
Fix the Super Admin Portal i18n regression where raw `admin.*` translation keys are displayed on screen instead of translated English, Spanish, and Papiamento labels. This is an i18n-only fix. Do not change Super Admin permissions, database logic, plan entitlements, pricing, plan limits, billing, customer data, authentication, RLS, backup functionality, or existing Super Admin business behavior.

Must inspect the actual Admin page translation calls and repair the existing i18n catalog/root translation resolution. The previous missing-key safety fallback prevented crashes but now exposes missing keys when the catalog lacks Super Admin labels.

## Checklist
- [ ] Inspect the actual Super Admin page and all `admin.*` translation calls
- [ ] Determine why `admin.*` keys are falling through to safe key fallback
- [ ] Add or repair English Super Admin translations for header, stats, tabs, buttons, forms, dialogs, notifications, loading, empty, error, and success states
- [ ] Add matching Spanish translations for the repaired Super Admin keys
- [ ] Add matching Papiamento translations for the repaired Super Admin keys
- [ ] Preserve safe fallback and placeholder replacement behavior without returning keys for known Admin labels
- [ ] Run targeted checks proving no known user-facing Super Admin `admin.*` keys resolve to raw keys in English, Spanish, or Papiamento
- [ ] Run project validation and report root cause, keys repaired, files changed, and runtime test results

## Acceptance
The Super Admin Portal displays translated labels instead of raw `admin.*` keys in English.
The same Super Admin keys resolve in Spanish and Papiamento through the existing i18n architecture.
The previous `replaceAll` undefined runtime error does not return.