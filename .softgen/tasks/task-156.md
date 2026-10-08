---
title: Corporate Branding regression restore
status: in_progress
priority: urgent
type: bug
tags: [corporate, branding, regression, i18n]
created_by: agent
created_at: 2026-10-08T14:23:20Z
position: 156
---

## Notes
Restore the previously implemented Corporate Branding functionality without reverting the Settings i18n fix. Do not rebuild from scratch or create duplicate branding systems, tables, buckets, contexts, APIs, or entitlement systems. Corporate Branding must remain Corporate-only with server-side entitlement protection. Lower plans must not receive Corporate Branding and must not crash from entitlement-denied responses. Preserve translations for English, Spanish, and Papiamento, including no raw `dashboard.settings.*` keys and translated Corporate Branding labels. Do not change pricing, plan limits, billing, lower-plan branding, Quick QR, Locations, Advanced Analytics, staff permissions, loyalty programs, or customer data.

## Checklist
- [x] Inspect Corporate Branding context, API, dashboard navigation, route page, and i18n catalog to identify what was removed or reverted
- [x] Restore missing Corporate Branding Settings page/navigation/functionality using the existing backend and i18n keys
- [ ] Preserve the Settings page i18n fix and verify no raw `dashboard.settings.*` keys remain
- [ ] Verify Corporate-only access, lower-plan graceful dashboard loading, and server-side entitlement protection
- [ ] Run project checks and report cause, files changed, restored functionality, and test results

## Acceptance
Corporate businesses can access Corporate Branding Settings, upload logo, choose colors, preview, save, refresh, and reset.
Trial, Starter, Business, and Professional businesses do not see Corporate Branding and their dashboards load normally.
Settings and Corporate Branding labels translate in English, Spanish, and Papiamento with no raw keys.