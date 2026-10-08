---
title: Corporate Branding visibility regression
status: done
priority: urgent
type: bug
tags: [corporate, branding, regression, dashboard]
created_by: agent
created_at: 2026-10-08T14:30:12Z
position: 157
---

## Notes
Fix the critical regression where Corporate Branding exists in code but is not visibly accessible from the Business Dashboard for a Corporate business. Do not rebuild from scratch or create duplicate branding systems. Restore the actual functional Branding page/navigation using the existing Corporate Branding context, page, API, storage, database fields, i18n keys, and server-side entitlement protection. Preserve the Settings i18n regression fix and do not allow raw `dashboard.settings.*` keys to return.

Where the Branding UI was found/missing:
- The functional page existed at `src/pages/dashboard/corporate-branding.tsx`.
- The route/API/context existed, but dashboard visibility depended on `corporateBrandingEnabled`.
- The nav item was hidden because the API did not expose backend-confirmed manage permission in a way the dashboard could use for Corporate admins.

Why it disappeared:
- The previous implementation effectively made visibility depend on brittle frontend gating instead of the existing server-side Corporate admin permission.
- Corporate businesses with the `corporate_branding` entitlement could have the route present but no visible dashboard navigation entry.

What was restored:
- `src/pages/api/business/corporate-branding.ts`: GET now returns `can_manage` from `is_corporate_admin_for_business`; PUT keeps server-side Corporate admin enforcement.
- `src/contexts/CorporateBrandingContext.tsx`: `fetchCorporateBranding()` now carries `can_manage` while still treating entitlement-denied lower-plan responses as unavailable instead of fatal.
- `src/components/dashboard/DashboardLayout.tsx`: Corporate Branding navigation is visible when the entitlement-backed API returns `available` and `can_manage: true`, not only through owner-only frontend assumptions.
- `src/pages/dashboard/corporate-branding.tsx`: the route requires `available && can_manage` before rendering the complete Branding Settings UI.
- Existing functional controls remain available: logo upload, logo preview, primary color, secondary/accent color, live preview, save, reset, saved reload/persistence through the existing API.

Database/storage changes:
- No schema changes.
- No new tables, buckets, or branding systems.
- Existing `businesses.logo`, `businesses.primary_color`, `businesses.secondary_color`, and `loyalty-assets` storage path are reused.

Entitlement changes:
- No pricing, plan limit, or entitlement definitions were changed.
- SQL verification showed `mega_plan` has `corporate_branding = true`; trial/starter/business/pro do not.
- Server-side API entitlement protection remains active.

Test results:
- Project checks passed with no CSS, linting, TypeScript, or runtime errors.
- Corporate path: dashboard now uses backend-confirmed `can_manage` to show the Corporate Branding nav item and page.
- Non-Corporate path: API entitlement denial remains protected; dashboard handles unavailable branding without runtime crash.
- i18n path: Settings i18n fix remains intact; Corporate Branding UI continues using existing translation keys for English, Spanish, and Papiamento.

## Checklist
- [x] Inspect CorporateBrandingContext, dashboard layout/navigation, Branding route/page, API, i18n keys, and entitlement gating to find why the UI is not visible
- [x] Restore a visible Corporate Branding entry for entitled Corporate businesses in the established dashboard location
- [x] Verify the Branding page provides logo upload, logo preview, primary color, secondary/accent color, live preview, save, reset, and saved reload behavior
- [x] Preserve Settings i18n and Corporate Branding i18n in English, Spanish, and Papiamento
- [x] Verify non-Corporate businesses cannot access Corporate Branding and dashboard loading remains normal
- [x] Run project checks and report exact cause, files changed, database/storage/entitlement changes, and test results

## Acceptance
Corporate businesses can see and open Corporate Branding from the Business Dashboard.
Corporate Branding controls are functional: logo upload, preview, colors, live preview, save, reset, and persistence after refresh.
Settings and Branding labels translate in English, Spanish, and Papiamento with no raw keys.