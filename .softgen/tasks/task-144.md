---
title: I18n undefined translation runtime fix
status: in_progress
priority: urgent
type: bug
tags: [i18n, runtime-error, admin-dashboard, corporate]
created_by: agent
created_at: 2026-10-08T11:17:55Z
position: 144
---

## Notes
Fix the runtime crash `Cannot read properties of undefined (reading 'replaceAll')` from `src/lib/i18n.ts` without changing authentication, database, RLS, billing, Quick QR, or business logic.

The fix must first identify the exact missing translation key, active language, requesting component, and whether the key is missing from English, Spanish, or Papiamento. Then implement safe fallback behavior that preserves placeholder replacement and audit recent Corporate keys for English, Spanish, and Papiamento coverage.

## Checklist
- [ ] Inspect `translate()` in `src/lib/i18n.ts` and `I18nProvider`
- [ ] Inspect Admin Dashboard translation calls around `src/pages/admin/index.tsx` lines 848-858
- [ ] Identify the exact undefined translation key, language, and requesting component
- [ ] Fix missing English, Spanish, and Papiamento translation coverage for the crashing key and related Corporate/Admin keys
- [ ] Add safe fallback behavior that never calls `replaceAll` on undefined/null and preserves placeholder replacement
- [ ] Audit newly added Corporate keys for Locations, Staff Location Assignment, Location Manager, Advanced Analytics, Quick QR, Branding, dashboard menus, and states
- [ ] Run project validation and targeted translation checks for English, Spanish, and Papiamento
- [ ] Report root cause, keys fixed, fallback behavior, files changed, and test results

## Acceptance
Admin Dashboard no longer crashes in English, Spanish, or Papiamento when translations are requested with placeholders.
Missing selected-language keys fall back to English, and missing English keys return a safe key fallback instead of crashing.
Existing placeholder replacement continues to work for values such as `{location}`, `{count}`, `{value}`, and `{program}`.