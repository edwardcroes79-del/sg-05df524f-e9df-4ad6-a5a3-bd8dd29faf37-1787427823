---
title: Customer auth branding restoration
status: done
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

Investigation finding:
- The override lives in `src/pages/auth/customer.tsx`, which serves both the Customer Sign In and New Account tabs used in QR return flows.
- The page was fetching business/program context correctly, but also applying the scanned business `primary_color` to the logo border, fallback icon, sign-in button, sign-up button, MFA icon, and MFA submit button through inline styles.
- No change was required in `src/pages/auth/login.tsx`, `src/pages/auth/register.tsx`, or the global branding context for this scoped fix.

Implementation:
- Removed business-color styling from the customer auth UI elements so the page falls back to Royalty Stamp theme colors.
- Preserved business name, program name, business logo, QR return path handling, and registration/sign-in functionality.
- Validation passed with no CSS, lint, TypeScript, or runtime errors.

## Checklist
- [x] Inspect the customer sign-in and create-account pages used in QR flows
- [x] Identify where business branding colors override Royalty Stamp branding
- [x] Restore Royalty Stamp branding on those two pages only
- [x] Preserve QR/business context and existing auth functionality
- [x] Validate the targeted change after implementation

## Acceptance
The Customer Sign In page and Create New Account page always show Royalty Stamp branding, even when opened from businesses with custom primary colors.
No other pages or branding systems are changed.