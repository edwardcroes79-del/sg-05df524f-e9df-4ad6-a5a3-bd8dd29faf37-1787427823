---
title: I18n undefined translation runtime fix
status: done
priority: urgent
type: bug
tags: [i18n, runtime-error, admin-dashboard, corporate]
created_by: agent
created_at: 2026-10-08T11:17:55Z
position: 144
---

## Notes
Fixed the runtime crash `Cannot read properties of undefined (reading 'replaceAll')` from `src/lib/i18n.ts` without changing authentication, database, RLS, billing, Quick QR, or business logic.

Exact translation key causing the error:
- `admin.notifications.planChangeRequested`

Language causing it:
- The crash could occur in English, Spanish, or Papiamento when the requested key was missing from both the active language dictionary and the English fallback dictionary.
- The active-language-specific failure was not because one language had a bad placeholder value; the `translate()` implementation attempted placeholder replacement on an undefined template when a key was missing.

Component requesting it:
- `src/pages/admin/index.tsx`
- Super Admin notification builder inside `AdminDashboard`
- The crashing call was `t("admin.notifications.planChangeRequested", { currentPlan, requestedPlan })`.

Root cause:
- `translate()` selected `dictionary[key]` and immediately ran `.replaceAll(...)` during placeholder replacement.
- When a translation key was missing, the selected template was `undefined`.
- Because `admin.notifications.planChangeRequested` was requested with placeholder values, the reducer attempted `replaceAll` on `undefined`.
- Related Admin notification keys were also missing and could have triggered the same runtime failure.

Translation keys added/fixed:
- `admin.common.currentPlan`
- `admin.common.unknownBusiness`
- `admin.notifications.addonRequest`
- `admin.notifications.quickStampRequested`
- `admin.notifications.customersRequested`
- `admin.notifications.downgradeRequest`
- `admin.notifications.upgradeRequest`
- `admin.notifications.planChangeRequested`
- `admin.notifications.businessRegistration`
- `admin.notifications.awaitingApproval`

Fallback behavior implemented:
- If the selected language contains the requested key, that translation is used.
- If the selected language is missing the key, the English translation is used.
- If English is also missing the key, the translation key itself is returned as a safe fallback.
- Placeholder replacement still runs for valid string templates and safely substitutes values such as `{location}`, `{count}`, `{value}`, `{program}`, `{currentPlan}`, and `{requestedPlan}`.
- `replaceAll` is no longer called on `undefined` or `null`.

Corporate translation audit coverage:
- Locations keys checked.
- Staff Location Assignment keys checked.
- Location Manager role keys checked.
- Advanced Analytics keys checked.
- Quick QR keys checked.
- Dashboard navigation/menu keys checked.
- Loading, empty, error, and status-state keys checked.
- The targeted audit covered English, Spanish, and Papiamento using the existing i18n architecture and the language name “Papiamento”.

Files changed:
- `src/lib/i18n.ts`

Validation/test results:
- Targeted translation test passed for languages: English (`en`), Spanish (`es`), and Papiamento (`pa`).
- Placeholder substitution passed for 21 tested placeholder cases across all three languages.
- Corporate key coverage passed for 57 targeted Corporate key checks across all three languages.
- Missing-key fallback was verified to return the key safely instead of crashing.
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- Admin Dashboard translation path no longer crashes from missing placeholder-bearing translation keys.

No changes were made to:
- Authentication
- Business logic
- Database
- RLS
- Billing
- Plan limits
- Quick QR functionality
- Corporate location architecture

## Checklist
- [x] Inspect `translate()` in `src/lib/i18n.ts` and `I18nProvider`
- [x] Inspect Admin Dashboard translation calls around `src/pages/admin/index.tsx` lines 848-858
- [x] Identify the exact undefined translation key, language, and requesting component
- [x] Fix missing English, Spanish, and Papiamento translation coverage for the crashing key and related Corporate/Admin keys
- [x] Add safe fallback behavior that never calls `replaceAll` on undefined/null and preserves placeholder replacement
- [x] Audit newly added Corporate keys for Locations, Staff Location Assignment, Location Manager, Advanced Analytics, Quick QR, Branding, dashboard menus, and states
- [x] Run project validation and targeted translation checks for English, Spanish, and Papiamento
- [x] Report root cause, keys fixed, fallback behavior, files changed, and test results

## Acceptance
Admin Dashboard no longer crashes in English, Spanish, or Papiamento when translations are requested with placeholders.
Missing selected-language keys fall back to English, and missing English keys return a safe key fallback instead of crashing.
Existing placeholder replacement continues to work for values such as `{location}`, `{count}`, `{value}`, and `{program}`.