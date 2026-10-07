---
title: Login UI regression restoration
status: done
priority: urgent
type: bug
tags: [auth, ui-regression, login, customer-login]
created_by: agent
created_at: 2026-10-07T17:13:37Z
position: 142
---

## Notes
Restored the actual rendered Business Login and Customer/Member Login UI after tracing the production routes/components instead of assuming the previous verification changed visible UI.

Actual route being rendered:
- Business Login: `/auth/login`
- Customer/Member Login: `/auth/customer`

Actual component being rendered:
- Business Login route renders `src/pages/auth/login.tsx`
- Customer/Member Login route renders `src/pages/auth/customer.tsx`

Root cause why previous changes were not visible:
- The previous pass only verified the auth pages and task notes, but the visible UI was still controlled by the actual rendered route markup and missing/incorrect `auth.*` i18n values.
- Business Login branding rendered as split/styled text rather than a reliably visible `RoyaltyStamp` wordmark in the HTML.
- Customer Login could replace the wallet header with dynamic business/program context, so `RoyaltyStamp Wallet` and the Aruba rewards prompt were not reliably visible on the live rendered route.
- The fix had to update the rendered route components and the i18n keys they actually consume.

Files changed:
- `src/pages/auth/login.tsx`
- `src/pages/auth/customer.tsx`
- `src/lib/i18n.ts`

Exact UI restored:
- Business Login now visibly includes RoyaltyStamp branding, Welcome Back, “Enter your credentials to access your business dashboard.”, Email Address, email input, Password, password input, Forgot password?, Sign In, and Register your business.
- Customer/Member Login now visibly includes RoyaltyStamp Wallet, “Collect stamps and unlock rewards in Aruba”, Sign In / New Account tabs, Email Address, Password, Forgot Password?, Sign In to Earn Stamps, customer terms/rewards notice, and Business Login.
- Dynamic customer QR/business context is preserved as secondary context instead of replacing the required wallet branding.
- Authentication handlers, Supabase Auth calls, registration flow, password reset routes, redirects, roles, and MFA behavior were not changed.

Production/live-render verification:
- `/auth/login` returned status 200 and live HTML contained all required Business Login strings: `RoyaltyStamp`, `Welcome Back`, `Enter your credentials to access your business dashboard.`, `Email Address`, `Password`, `Forgot password?`, `Sign In`, and `Register your business`.
- `/auth/customer` returned status 200 and live HTML contained all required Customer Login strings: `RoyaltyStamp Wallet`, `Collect stamps and unlock rewards in Aruba`, `Sign In`, `New Account`, `Email Address`, `Password`, `Forgot Password?`, `Sign In to Earn Stamps`, and `Business Login`.
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- Desktop/mobile responsiveness is preserved by the existing responsive Tailwind layout on the rendered pages.
- English visible-string verification passed through live route HTML. Spanish and Papiamento coverage was restored through the existing i18n catalog for the same rendered `auth.*` keys.

No changes were made to:
- Authentication logic
- Supabase Auth
- Registration logic
- Password reset logic
- Email verification
- Redirect logic
- User roles
- Business/customer authentication behavior
- Database architecture

## Checklist
- [x] Inspect current Business Login and Customer/Member Login pages and related auth UI dependencies
- [x] Identify why the first fix did not change the rendered UI
- [x] Trace actual rendered Business Login route, page component, imports, and conditional UI states
- [x] Trace actual rendered Customer/Member Login route, page component, imports, tabs, and conditional UI states
- [x] Restore the rendered Business Login UI with required previous design elements
- [x] Restore the rendered Customer/Member Login UI with required previous design elements
- [x] Verify visible rendered UI for desktop/mobile and language paths as far as the environment allows
- [x] Run project checks and report actual rendered route/component, root cause, files changed, restored UI, and verification result

## Acceptance
Business Login visibly shows RoyaltyStamp branding, Welcome Back, helper text, labels, forgot password, Sign In, and Register your business.
Customer/Member Login visibly shows RoyaltyStamp Wallet, Aruba rewards prompt, Sign In/New Account tabs, labels, forgot password, Sign In to Earn Stamps, notice, and Business Login.
Project validation passes with no introduced errors.