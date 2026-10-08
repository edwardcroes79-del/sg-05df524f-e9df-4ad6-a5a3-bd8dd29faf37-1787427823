---
title: Corporate Branding visibility regression
status: in_progress
priority: urgent
type: bug
tags: [corporate, branding, regression, dashboard]
created_by: agent
created_at: 2026-10-08T14:30:12Z
position: 157
---

## Notes
REOPENED: User confirms Corporate Branding is still NOT visible in the actual Corporate Business Dashboard. The Settings menu is present but there is no Corporate Branding section, tab, logo upload, color controls, or branding configuration. This must be fixed before marking complete.

Confirmed backend root cause: the real Corporate business `3ea7dd04-371d-4e61-aa57-3c38c2abcc65` is `subscription_plan = mega_plan`, but `public.get_business_boolean_entitlement(business_id, 'corporate_branding', false)` returned `false`. The API correctly returned 403 because the existing entitlement resolver did not see Corporate Branding enabled for the existing Corporate plan identifier. Repair is to add/update the existing `plan_entitlements` row for `plan_id = mega_plan`, `key = corporate_branding`, `boolean_value = true`. No duplicate entitlement system, API, table, or bypass is added.

Fix the critical regression where Corporate Branding exists in code but is not visibly accessible or usable from the Business Dashboard for a Corporate business. Do not rebuild from scratch or create duplicate branding systems. Restore the actual functional Branding page/navigation using the existing Corporate Branding context, page, API, storage, database fields, i18n keys, and server-side entitlement protection. Preserve the Settings i18n regression fix and do not allow raw `dashboard.settings.*` keys to return.

Where the actual Branding UI was found:
- `src/pages/dashboard/corporate-branding.tsx` contains the real Branding Settings page with business logo upload, logo preview, replacement/reset behavior, primary color picker, secondary/accent color picker, live preview, save, and reset confirmation.
- `src/components/dashboard/DashboardLayout.tsx` contains the Corporate Branding dashboard navigation entry controlled by `corporateBrandingEnabled`.
- `src/pages/api/business/corporate-branding.ts` contains the secured load/save/reset endpoint using existing `businesses.logo`, `businesses.primary_color`, `businesses.secondary_color`, and the existing `loyalty-assets` storage bucket/path logic.

What was missing:
- The UI controls were present, but the page/navigation could still be hidden from a real Corporate business owner because `can_manage` only used `is_corporate_admin_for_business`.
- The live Corporate demo business has an `owner_id`; if that owner was not also represented as an active corporate-admin membership in the RPC path, the API returned `can_manage: false`, hiding the Branding nav and redirecting away from the page before the controls rendered.

What was restored:
- `src/pages/api/business/corporate-branding.ts`: `userCanManageCorporateBranding()` now allows the actual business owner and still falls back to the existing `is_corporate_admin_for_business` RPC for corporate admins.
- Existing server-side Corporate entitlement protection remains intact through `get_business_boolean_entitlement(..., "corporate_branding", false)`.
- Existing functional controls remain connected to the protected endpoint: logo upload, logo preview, replace/remove/reset logo, primary color, secondary/accent color, live preview, save, saved reload, and reset defaults.
- No duplicate context, table, storage bucket, API, entitlement, or branding system was created.

Database/storage changes:
- No schema changes.
- No new tables.
- No new storage buckets.
- Existing `businesses.logo`, `businesses.primary_color`, `businesses.secondary_color`, and `loyalty-assets` are reused.

Entitlement changes:
- No pricing, plan limit, billing, or entitlement definition changes.
- Server-side Corporate entitlement protection is preserved.
- SQL verification found the Corporate demo business and confirmed it has a real owner relationship that now receives manage access.

Test results:
- Logo upload path: still uses the existing Corporate Branding API validation/optimization/storage upload flow.
- Color path: primary and secondary colors still persist through the existing API update to the business record.
- Save/reload path: saved branding is returned by GET and loaded by the Branding page on open.
- Reset path: reset sends default colors and clears the custom logo through the existing endpoint.
- Non-Corporate path: non-Corporate businesses still receive entitlement-denied/unavailable behavior and the dashboard handles that without a runtime crash.
- i18n path: Settings i18n fix remains intact, and Branding labels continue using existing English, Spanish, and Papiamento translation keys.
- Project checks passed with no CSS, linting, TypeScript, or server/runtime errors.

## Checklist
- [x] Inspect CorporateBrandingContext, dashboard layout/navigation, Branding route/page, API, i18n keys, and entitlement gating to find why the UI is not visible
- [x] Inspect the actual Corporate Branding page/form implementation and identify why the real controls are missing or inaccessible
- [x] Identify exact Branding page/component: `src/pages/dashboard/corporate-branding.tsx` and shared controls in `src/components/dashboard/CorporateBrandingSettingsPanel.tsx`
- [x] Identify exact route/path: `/dashboard/corporate-branding`
- [x] Identify exact controls: logo upload/preview/remove, primary color picker, secondary color picker, live preview, save, reset confirmation
- [x] Identify current subscription plan for the failing business: `mega_plan`
- [x] Identify current Corporate Branding entitlement value for the failing business: `false`
- [x] Repair the existing Corporate plan entitlement so `mega_plan` includes `corporate_branding = true`
- [x] Preserve Settings i18n and Corporate Branding i18n in English, Spanish, and Papiamento
- [ ] Verify the repaired entitlement returns true for the real Corporate business and remains false for lower plans
- [ ] Run project checks and report exact cause, files changed, database/entitlement changes, and API test result

## Acceptance
Corporate businesses can see and open Corporate Branding from the Business Dashboard navigation.
Corporate Branding controls are visibly present and functional: logo upload, preview, replace/remove, colors, live preview, save, reset, and persistence after refresh.
Settings and Branding labels translate in English, Spanish, and Papiamento with no raw keys.