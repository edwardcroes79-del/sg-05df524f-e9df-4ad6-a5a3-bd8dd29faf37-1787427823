---
title: Customer auth branding restoration
status: in_progress
priority: high
type: bug
tags: [customer-auth, branding, qr-flow, ui]
created_by: agent
created_at: 2026-11-27T12:17:55Z
position: 316
---
## Notes
Restore the original Royalty Stamp pink/red branding on the two customer authentication pages reached from business QR code flows. Business primary colors must not override Royalty Stamp branding on the Customer Sign In page or the Create New Account page. Preserve existing QR context, authentication logic, registration flow, logo, typography, layout, and all other app surfaces.

Scope restrictions:
- Only fix the two customer auth pages.
- Do not modify dashboard pages, loyalty cards, business admin pages, super admin pages, global theming, or unrelated customer pages.
- If shared code is involved, keep the fix scoped so only these two pages use Royalty Stamp branding.

## Checklist
- [ ] Inspect the customer sign-in and create-account pages used in QR flows
- [ ] Identify where business branding colors override Royalty Stamp branding
- [ ] Restore Royalty Stamp branding on those two pages only
- [ ] Preserve QR/business context and existing auth functionality
- [ ] Validate the targeted change after implementation

## Acceptance
The Customer Sign In page and Create New Account page always show Royalty Stamp branding, even when opened from businesses with custom primary colors.
No other pages or branding systems are changed.