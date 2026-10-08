---
title: Settings page i18n regression fix
status: done
priority: urgent
type: bug
tags: [i18n, settings, dashboard]
created_by: agent
created_at: 2026-10-08T14:19:24Z
position: 155
---

## Notes
Fix the Business Dashboard Settings page showing raw `dashboard.settings.*` translation keys. Use the existing i18n system only. Do not hardcode translated text in components and do not change Settings functionality, business data, database structure, auth, RLS, branding logic, Corporate entitlements, Quick QR, Locations, Analytics, Billing, or plan limits. Audit the entire Settings page and all dashboard.settings keys in English, Spanish, and Papiamento. Verify this does not regress previous i18n fixes for Super Admin Portal, Corporate Advanced Analytics, Royalty Insights, Quick QR Analytics, and Loyalty Programs.

Root cause: `src/pages/dashboard/settings.tsx` already used the correct i18n helper, but the translation dictionaries only contained `dashboard.settings.seoTitle`; the rest of the Settings page keys were missing, so `translate()` fell back to returning the raw key.

Files changed:
- `src/lib/i18n.ts`: added missing English, Spanish, and Papiamento translations for all user-facing `dashboard.settings.*` keys used by the Business Dashboard Settings page.
- `.softgen/tasks/task-155.md`: recorded completion and validation.

Test results:
- Search confirmed all `dashboard.settings.*` user-facing usages in the Settings page now have matching dictionary entries.
- Corporate Branding Settings keys remain translated in English, Spanish, and Papiamento.
- Previous i18n fixes for Super Admin Portal, Corporate Advanced Analytics, Royalty Insights, Quick QR Analytics, and Loyalty Programs remain present.
- Project checks passed with no CSS, linting, TypeScript, or server/runtime errors.

## Checklist
- [x] Inspect i18n provider, Settings page, and translation dictionaries for `dashboard.settings.*` resolution
- [x] Search all user-facing `dashboard.settings.` usages across the application
- [x] Add or repair missing English Settings translations in the existing dictionary
- [x] Add or repair missing Spanish Settings translations in the existing dictionary
- [x] Add or repair missing Papiamento Settings translations in the existing dictionary
- [x] Verify Corporate Branding Settings keys remain translated and previous i18n fixes are not broken
- [x] Run project checks and report root cause, files changed, repaired keys, and test results

## Acceptance
No raw `dashboard.settings.*` keys are visible on the Settings page in English, Spanish, or Papiamento.
Settings save/cancel/loading/success/error functionality remains unchanged.
Previous i18n fixes for admin, analytics, Quick QR, and loyalty program pages remain intact.