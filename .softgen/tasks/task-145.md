---
title: Super Admin translation regression fix
status: done
priority: urgent
type: bug
tags: [i18n, super-admin, regression, translations]
created_by: agent
created_at: 2026-10-08T11:32:56Z
position: 145
---

## Notes
Fixed the Super Admin Portal i18n regression where raw `admin.*` translation keys were displayed on screen instead of translated labels.

Root cause:
- The previous runtime safety fix correctly prevented `replaceAll` crashes by returning the translation key when a key was missing.
- The Super Admin Portal requested many `admin.*` keys that were not present in the active flat translation catalog.
- Because those keys were missing, the safe fallback returned raw keys such as `admin.title`, `admin.description`, `admin.stats.totalMerchants`, and `admin.tabs.merchants`.
- This was a translation dictionary coverage issue, not a Super Admin rendering/design issue.

Translation dictionary issue:
- The app uses a flat key/value translation catalog, not nested objects.
- Super Admin keys were requested as flat strings through `t("admin...")`.
- The English, Spanish, and Papiamento catalogs did not contain complete Super Admin Portal coverage.
- Added `adminTranslationOverrides` and merged it into the existing `translationCatalog` for `en`, `es`, and `pa`.

Keys repaired/covered:
- Header and SEO: `admin.seoTitle`, `admin.portal`, `admin.title`, `admin.description`, `admin.backToMerchant`
- Statistics: `admin.stats.totalMerchants`, `admin.stats.activeSubscriptions`, `admin.stats.totalCustomers`, `admin.stats.totalStampsIssued`
- Tabs: `admin.tabs.merchants`, `admin.tabs.payments`, `admin.tabs.plans`, `admin.tabs.addons`, `admin.tabs.customers`, `admin.tabs.paymentSettings`, `admin.tabs.website`, `admin.tabs.security`, `admin.tabs.backups`
- Notifications, contracts, merchants, payments, customers, delete dialogs, API errors, MFA/security, add-ons, and shared admin labels.
- Updated the Backups tab label to use `t("admin.tabs.backups")` through the existing i18n system.

English translations:
- Confirmed expected English labels, including:
  - `admin.title` → `Platform Management`
  - `admin.description` → `Configure subscription plans, monitor businesses, and manage limits.`
  - `admin.stats.totalMerchants` → `Total Merchants`
  - `admin.tabs.merchants` → `Merchants & Subscriptions`
  - `admin.tabs.backups` → `Backups`

Spanish translations:
- Added Spanish coverage for the same Super Admin keys, including header, stats, tabs, notifications, forms, dialogs, statuses, and error/success messages.

Papiamento translations:
- Added Aruba Papiamento coverage for the same Super Admin keys.
- Used “Papiamento” naming consistently.

Files changed:
- `src/lib/i18n.ts`
- `src/pages/admin/index.tsx`

Runtime test results:
- Targeted translation test passed for English (`en`), Spanish (`es`), and Papiamento (`pa`).
- 72 Super Admin key/language combinations were checked.
- The test verified no checked output was empty, equal to a raw `admin.*` key, or left with unreplaced placeholders.
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- The previous `replaceAll` undefined runtime error did not return.

No changes were made to:
- Super Admin permissions
- Database logic
- Plan entitlements
- Pricing
- Plan limits
- Billing
- Customer data
- Authentication
- RLS
- Backup functionality
- Existing Super Admin functionality

## Checklist
- [x] Inspect `src/lib/i18n.ts`, `I18nProvider`, and the Super Admin page translation calls
- [x] Identify why raw `admin.*` keys were displayed instead of translated labels
- [x] Confirm missing English `admin.*` keys in the active flat translation catalog
- [x] Add Super Admin English translations for header, stats, tabs, notifications, forms, dialogs, states, and errors
- [x] Add matching Spanish translations
- [x] Add matching Papiamento translations
- [x] Keep the existing i18n architecture as the source of UI text
- [x] Verify placeholder replacement still works
- [x] Verify no checked `admin.*` keys fall through to raw key output
- [x] Run project validation

## Acceptance
The Super Admin Portal no longer displays raw `admin.*` translation keys for the audited Super Admin labels.
English, Spanish, and Papiamento resolve the audited Super Admin keys through the existing i18n architecture.
The previous `replaceAll` undefined runtime error does not return.