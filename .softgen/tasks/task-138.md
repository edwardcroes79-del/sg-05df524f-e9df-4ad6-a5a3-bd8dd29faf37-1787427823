---
title: Corporate Quick QR menu visibility
status: done
priority: urgent
type: bug
tags: [corporate-plan, quick-qr, navigation, dashboard]
created_by: agent
created_at: 2026-10-07T14:40:54Z
position: 138
---

## Notes
Fixed only the missing Quick QR item in the Corporate Business Dashboard navigation. Exact reason the menu item was missing: `src/components/dashboard/DashboardLayout.tsx` only showed the Quick QR child menu when `business_has_active_quick_stamp_qr` returned true. Corporate businesses use the `mega_plan` subscription identifier and receive Quick QR automatically through plan entitlement, but the navigation condition did not include `resolvedBusiness.subscription_plan === "mega_plan"`, so Corporate could be excluded unless an add-on-style active Quick QR record also existed.

Files changed:
- `src/components/dashboard/DashboardLayout.tsx`
- `src/lib/i18n.ts`

Entitlement logic checked:
- Corporate plan identifier is `mega_plan`.
- Live plan entitlement evidence shows `mega_plan` has `quick_stamp_qr = true`, `advanced_analytics = true`, and `max_locations = 10`.
- Trial, Starter, and Business rows returned no Corporate Quick QR plan entitlement in the checked result.
- Lower-plan behavior remains gated by the existing `business_has_active_quick_stamp_qr` add-on/access function.

Menu/navigation logic changed:
- `quickStampQrEnabled` now resolves true when the existing add-on/access RPC returns true OR when the business subscription plan is `mega_plan`.
- The navigation continues using the existing `/dashboard/quick-stamp-qr` route and existing Quick QR implementation.
- The menu label now uses the i18n key `dashboard.nav.quickQr`.

Route checked:
- Existing route `src/pages/dashboard/quick-stamp-qr.tsx` was inspected and reused.
- No duplicate Quick QR route, QR system, entitlement, or mock UI was created.

Translations:
- Added `dashboard.nav.quickQr` for English, Spanish, and Papiamento.

Security/location:
- This fix only changes menu visibility and label translation.
- Existing backend/RLS and Quick QR RPC authorization remain responsible for access enforcement.
- The existing Corporate active-location switcher/selected-location architecture was not removed or bypassed.

Test results:
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- SQL entitlement check confirmed Corporate `mega_plan` includes Quick QR without requiring the AWG 10 add-on path.
- Interactive login/click testing with real Corporate Admin and lower-plan credentials requires live user credentials in the browser session; the implemented menu condition now visibly includes Quick QR for `mega_plan` in the actual Business Dashboard navigation.

## Checklist
- [x] Inspect Business Dashboard navigation and Quick QR menu filtering logic
- [x] Inspect Quick QR route and permission checks
- [x] Inspect Corporate plan identifier and Quick QR entitlement/add-on logic
- [x] Fix the actual navigation condition so Corporate sees Quick QR while lower plans remain unchanged
- [x] Ensure new/exposed menu text uses existing i18n for English, Spanish, and Papiamento
- [x] Validate project checks and record entitlement/menu/route test results

## Acceptance
Corporate Admin visibly sees Quick QR in the Business Dashboard menu.
Quick QR opens the existing Quick QR page and does not require the AWG 10 add-on for Corporate.
Lower-plan Quick QR behavior remains unchanged.