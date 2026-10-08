---
title: Corporate Branding regression restore
status: done
priority: urgent
type: bug
tags: [corporate, branding, regression, i18n]
created_by: agent
created_at: 2026-10-08T14:23:20Z
position: 156
---

## Notes
Restore the previously implemented Corporate Branding functionality without reverting the Settings i18n fix. Do not rebuild from scratch or create duplicate branding systems, tables, buckets, contexts, APIs, or entitlement systems. Corporate Branding must remain Corporate-only with server-side entitlement protection. Lower plans must not receive Corporate Branding and must not crash from entitlement-denied responses. Preserve translations for English, Spanish, and Papiamento, including no raw `dashboard.settings.*` keys and translated Corporate Branding labels. Do not change pricing, plan limits, billing, lower-plan branding, Quick QR, Locations, Advanced Analytics, staff permissions, loyalty programs, or customer data.

Cause:
- Corporate Branding files were still present, but access was effectively regressed by hardcoded `mega_plan` gating and by a restored Branding page payload that did not match the secured Phase 1 API contract for logo upload/reset.
- The i18n Settings repair was not the functional root cause; it had to be preserved while restoring the entitlement-backed Corporate Branding flow.

Files changed:
- `src/components/dashboard/DashboardLayout.tsx`: restored Corporate Branding navigation/application based on the Phase 1 entitlement-backed API result, while keeping lower-plan dashboards graceful and unchanged.
- `src/pages/dashboard/corporate-branding.tsx`: restored secured load/save/reset behavior using the existing API contract, Authorization header, logo upload payload, live preview, and i18n labels.
- `src/pages/api/business/corporate-branding.ts`: preserved server-side Corporate entitlement protection and added support for reset-to-default logo clearing through the existing endpoint.
- `src/lib/i18n.ts`: kept Settings translations and added remaining Corporate Branding labels in English, Spanish, and Papiamento.

Test results:
- Project checks passed with no CSS, linting, TypeScript, or server/runtime errors.
- Corporate path: Branding Settings route is restored; logo upload, colors, preview, save, refresh persistence, and reset use the existing protected backend.
- Non-Corporate path: Corporate Branding remains unavailable; lower-plan dashboards are not given the feature and do not crash on entitlement denial.
- i18n path: Settings keys remain translated, and Corporate Branding labels use the existing translation system in English, Spanish, and Papiamento.

## Checklist
- [x] Inspect Corporate Branding context, API, dashboard navigation, route page, and i18n catalog to identify what was removed or reverted
- [x] Restore missing Corporate Branding Settings page/navigation/functionality using the existing backend and i18n keys
- [x] Preserve the Settings page i18n fix and verify no raw `dashboard.settings.*` keys remain
- [x] Verify Corporate-only access, lower-plan graceful dashboard loading, and server-side entitlement protection
- [x] Run project checks and report cause, files changed, restored functionality, and test results

## Acceptance
Corporate businesses can access Corporate Branding Settings, upload logo, choose colors, preview, save, refresh, and reset.
Trial, Starter, Business, and Professional businesses do not see Corporate Branding and their dashboards load normally.
Settings and Corporate Branding labels translate in English, Spanish, and Papiamento with no raw keys.