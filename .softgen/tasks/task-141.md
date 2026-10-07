---
title: Corporate translation audit and fix
status: done
priority: urgent
type: chore
tags: [corporate-plan, i18n, translations, localization]
created_by: agent
created_at: 2026-10-07T15:31:00Z
position: 141
---

## Notes
Completed the Corporate build translation audit and fixes using the existing i18n system only.

Audited Corporate pages/components/features:
- Business Dashboard navigation/menu
- Corporate active location selector/switcher
- Locations page
- Create Location form
- Edit Location form
- Location management cards, empty states, loading/error/success toasts, and status labels
- Staff Location Assignment component keys and Papiamento overrides
- Location Manager role labels and assignment dialog labels
- Corporate Advanced Analytics page
- Corporate Analytics date filters, location filters, metric cards, tables, charts, empty states, loading states, errors, and chart titles
- Location performance / leaderboard-style analytics table
- Program performance analytics
- Quick QR analytics panel
- Cross-location analytics
- Activity trends chart
- Corporate Quick QR / Quick Issue Stamp labels and Papiamento override coverage
- Corporate settings SEO label exposed through the translated dashboard settings key

Translation keys added/completed:
- `dashboard.nav.advancedAnalytics`
- `dashboard.locationSwitcher.label`
- `dashboard.locations.*`
- `dashboard.analytics.*`
- `dashboard.analytics.customerMetric.*`
- completed `dashboard.quickStamp.*` Papiamento overrides for newly exposed Quick QR text
- completed Corporate staff location assignment Papiamento overrides under `dashboard.staff.*`

Spanish translations added:
- Corporate Locations, Create/Edit Location, active location switcher, Corporate Advanced Analytics, analytics filters, metric cards, tables, charts, Quick QR analytics, cross-location analytics, customer metric labels, and Corporate settings SEO labels.

Papiamento translations added:
- Corporate staff assignment labels and confirmations
- Active location selector
- Corporate Locations, Create/Edit Location, form labels, status labels, empty/error/success states
- Corporate Advanced Analytics page, filters, metrics, charts, tables, Quick QR analytics, cross-location analytics, and customer metric labels
- Quick QR / Quick Issue Stamp exposed UI labels and validation text
- Corporate settings SEO label

Hardcoded strings found and fixed:
- `Advanced Analytics` dashboard navigation label was hardcoded and now uses `dashboard.nav.advancedAnalytics`.
- Locations page titles, buttons, form labels, status labels, cards, empty states, errors, and toasts were hardcoded and now use `useI18n`.
- Advanced Analytics titles, filters, metric labels, table headers, empty states, loading text, errors, and chart tooltips were hardcoded and now use `useI18n`.
- Papiamento Quick QR strings previously fell back to English and now have Papiamento overrides.
- Mixed-language Corporate translation blocks in `src/lib/i18n.ts` were corrected so English, Spanish, and Papiamento values remain in their proper language sections.

Files changed:
- `src/lib/i18n.ts`
- `src/components/dashboard/DashboardLayout.tsx`
- `src/pages/dashboard/locations.tsx`
- `src/pages/dashboard/analytics.tsx`

Validation/test results:
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- Focused searches were run for newly exposed Corporate labels such as Advanced Analytics, Create Location, Location Manager, Corporate-wide, Active location, and Quick Issue Stamp.
- Remaining search hits for Spanish phrases such as `Ubicación activa` and `Analítica avanzada Corporate` are in the Spanish dictionary block, not unexpected hardcoded UI text.
- No separate translation system was created.
- No business logic, database architecture, pricing, billing, permissions, lower-plan behavior, Quick QR entitlement behavior, loyalty program behavior, or customer functionality was changed.

Remaining untranslated strings:
- No remaining untranslated hardcoded strings were identified in the audited newly created/modified Corporate surfaces.
- Dynamic business data such as real location names, program names, staff names, and API-provided error text remains data-driven and is not translated by design.

## Checklist
- [x] Audit Corporate pages/components/menus/modals for hardcoded user-facing strings
- [x] Add or complete English, Spanish, and Papiamento keys in the existing i18n system
- [x] Replace hardcoded Corporate UI strings with existing i18n lookups
- [x] Verify nested dialogs/forms/loading/empty/error/success states use translations
- [x] Preserve business logic and existing lower-plan behavior
- [x] Run project checks and record final translation audit report

## Acceptance
Corporate navigation, Locations, Staff Location Assignment, Advanced Analytics, Quick QR, location selector, and Corporate settings surfaces use the existing i18n system.
Every new Corporate translation key has English, Spanish, and Papiamento coverage.
No unexpected hardcoded English text remains on newly created Corporate pages when Spanish or Papiamento is selected.