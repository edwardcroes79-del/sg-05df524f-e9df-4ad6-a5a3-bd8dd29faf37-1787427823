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
Fix the critical regression where Corporate Branding exists in code but is not visibly accessible or usable from the Business Dashboard for a Corporate business. Do not rebuild from scratch or create duplicate branding systems. Restore the actual functional Branding page/navigation using the existing Corporate Branding context, page, API, storage, database fields, i18n keys, and server-side entitlement protection. Preserve the Settings i18n regression fix and do not allow raw `dashboard.settings.*` keys to return.

Current reopened issue: prior work restored part of the visibility/access gate, but the user reports the actual Corporate Branding controls are still not visible/usable. The next pass must inspect the page implementation itself and verify the visible controls: logo upload, logo preview, replace/remove logo, primary color picker, secondary color picker, live preview, save, reset, saved reload, and Corporate-only access.

## Checklist
- [x] Inspect CorporateBrandingContext, dashboard layout/navigation, Branding route/page, API, i18n keys, and entitlement gating to find why the UI is not visible
- [ ] Inspect the actual Corporate Branding page/form implementation and identify why the real controls are missing or inaccessible
- [ ] Restore a visible Corporate Branding entry for entitled Corporate businesses in the established dashboard location
- [ ] Restore the complete functional Branding controls: logo upload, logo preview, replace/remove logo, primary color picker, secondary/accent picker, live preview, save, reset, and saved reload
- [ ] Preserve Settings i18n and Corporate Branding i18n in English, Spanish, and Papiamento
- [ ] Verify non-Corporate businesses cannot access Corporate Branding and dashboard loading remains normal
- [ ] Run project checks and report exact cause, files changed, database/storage/entitlement changes, and test results

## Acceptance
Corporate businesses can see and open Corporate Branding from the Business Dashboard.
Corporate Branding controls are visibly present and functional: logo upload, preview, replace/remove, colors, live preview, save, reset, and persistence after refresh.
Settings and Branding labels translate in English, Spanish, and Papiamento with no raw keys.