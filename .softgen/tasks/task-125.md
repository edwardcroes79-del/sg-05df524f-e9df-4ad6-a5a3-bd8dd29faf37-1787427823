---
title: Super Admin mobile scrolling
status: in_progress
priority: urgent
type: bug
tags: [admin, mobile, layout, scrolling]
created_by: agent
created_at: 2026-10-06T02:43:57Z
position: 125
---

## Notes
Fix the Super Admin section rendering and scrolling issue. Desktop and mobile both showed blank content for sections such as Payment Review because the tab state changed correctly but the selected content panel was missing. Must preserve existing database queries, RLS, authentication, permissions, backup logic, and all Super Admin actions.

Confirmed root cause: `src/pages/admin/index.tsx` had 9 `TabsTrigger` values, but only `TabsContent` panels for `merchants` and `backups`. Selecting `payments`, `plans`, `addons`, `customers`, `payment_settings`, `website`, or `security` made the tab active but Radix/shadcn Tabs had no matching content component to mount, so the area below the tab list was blank. This also made the earlier mobile symptom look like a scroll problem because several selected sections had no content height at all.

Fix applied: restored real data-backed `TabsContent` panels for Payment Review, Subscription Plans & Limits, Customer Capacity Add-ons, Customers, Payment Settings, Website Settings, and Account Security inside the existing `Tabs` parent. Panels use existing state, handlers, Supabase-backed data, and mobile-safe overflow wrappers. Merchants and Backups content remains in place.

## Checklist
- [x] Inspect Super Admin responsive layout, selected-section rendering, mobile navigation, and overflow/height/flex containers
- [x] Identify the exact root cause of blank/inaccessible sections
- [x] Apply the smallest safe layout/rendering fix so every Super Admin tab has matching real content
- [x] Preserve desktop scrolling/layout and existing navigation/selected-section behavior
- [ ] Test all Super Admin sections for content rendering, top-to-bottom scrolling, and section switching behavior
- [ ] Run project validation and production build validation
- [ ] Report root cause, files changed, desktop/mobile test coverage, and build result

## Acceptance
Every Super Admin section can scroll from top to bottom on mobile without trapped content.
Desktop Super Admin layout remains unchanged.
Navigation between Super Admin sections does not lock or break scrolling.