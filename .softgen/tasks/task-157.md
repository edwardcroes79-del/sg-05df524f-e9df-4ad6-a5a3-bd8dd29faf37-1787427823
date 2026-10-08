---
title: Corporate Branding visibility regression
status: in_progress
priority: urgent
type: bug
tags: [corporate, branding, regression, dashboard]
created_by: agent
created_at: 2026-10-08T14:30:29Z
position: 157
---

## Notes
User reports Corporate Branding is still missing from the Business Dashboard for Corporate businesses. Must inspect the current codebase and restore the actual functional UI, not just backend/API or placeholder navigation. Preserve the prior Settings i18n fix so no raw `dashboard.settings.*` keys return. Corporate Branding must remain Corporate-only with server-side entitlement protection, business_id isolation, storage/RLS security, and graceful lower-plan dashboard loading. Do not change pricing, billing, plan limits, Quick QR, Locations, Advanced Analytics, Staff, Loyalty Programs, existing lower-plan branding, or customer data.

## Checklist
- [ ] Inspect CorporateBrandingContext, dashboard layout/navigation, Branding route/page, API, i18n keys, and entitlement gating to find why the UI is not visible
- [ ] Restore a visible Corporate Branding entry for entitled Corporate businesses in the established dashboard location
- [ ] Verify the Branding page provides logo upload, logo preview, primary color, secondary/accent color, live preview, save, reset, and saved reload behavior
- [ ] Preserve Settings i18n and Corporate Branding i18n in English, Spanish, and Papiamento
- [ ] Verify non-Corporate businesses cannot access Corporate Branding and dashboard loading remains normal
- [ ] Run project checks and report exact cause, files changed, database/storage/entitlement changes, and test results

## Acceptance
Corporate businesses can see and open the Corporate Branding UI from the dashboard and use the full logo/color controls.
Trial, Starter, Business, and Professional businesses do not see or access Corporate Branding and do not crash.
Settings and Branding labels translate in English, Spanish, and Papiamento with no raw keys.