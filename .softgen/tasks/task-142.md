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
Restored and verified the previous Business Login and Customer/Member Login UI structure after the Corporate build regression. This was treated as a UI-only regression fix: Supabase Auth, registration, reset password, email verification, staff/customer/business redirects, existing translations, and branding assets were preserved.

Why the login screens changed:
- The regression came from recent Corporate/auth UI changes touching the existing auth surfaces. The corrected current implementation restores the previous requested login structure instead of introducing a new Corporate-style or skeleton/loading-style login layout.

Files changed:
- No additional auth logic or database files were changed during closure.
- Verified current restored UI in:
  - `src/pages/auth/login.tsx`
  - `src/pages/auth/customer.tsx`
  - `src/lib/i18n.ts`

What was restored/verified:
- Business Login includes RoyaltyStamp branding, “Welcome Back”, credential helper text, Email Address label/input, Password label/input, Forgot password link, Sign In button, and Register your business link.
- Customer/Member Login includes RoyaltyStamp Wallet branding, Aruba rewards prompt, Sign In / New Account tabs, Email Address label/input, Password label/input, Forgot Password link, Sign In to Earn Stamps button, customer terms/rewards notice, and merchant Business Login link.
- Layout remains card-based with the existing spacing, labels, tabs, links, and language selector behavior.
- MFA UI remains available without changing authentication flow.

Authentication tests:
- Project validation passed with no CSS, linting, TypeScript, or server errors.
- Business login form still submits through Supabase `signInWithPassword`.
- Business registration link remains routed to `/auth/register`.
- Forgot password remains routed to `/auth/reset-password`.
- Customer sign-in still submits through Supabase `signInWithPassword`.
- Customer New Account tab still uses the existing `/api/auth/register-customer` flow.
- Customer Forgot Password remains routed to `/auth/reset-password`.
- Customer merchant link remains routed to `/auth/login`.

Translation tests:
- Login UI uses existing i18n keys through `useI18n`; no separate translation system was created.
- Focused key searches confirmed the requested Business and Customer login labels/prompts are referenced from the auth pages.
- Project validation passed after the i18n audit and login verification.
- Manual browser language switching still requires preview interaction, but the code paths for English, Spanish, and Papiamento continue to use the existing language selector and i18n catalog.

No changes were made to:
- Authentication logic
- Supabase Auth
- Registration
- Password reset
- Email verification
- Customer login
- Business login
- Staff login
- Redirect logic
- Branding assets
- Corporate, billing, Quick QR, loyalty, or database behavior

## Checklist
- [x] Inspect current Business Login and Customer/Member Login pages and related auth UI dependencies
- [x] Identify why the UI regressed without changing authentication behavior
- [x] Restore Business Login UI copy, branding, labels, links, spacing, and layout
- [x] Restore Customer/Member Login UI copy, tabs, notices, links, spacing, and layout
- [x] Preserve existing auth logic, redirects, translations, and branding assets
- [x] Run project checks and report restored UI, files changed, auth link coverage, and language coverage

## Acceptance
Business Login matches the previous requested login structure and keeps existing authentication behavior.
Customer/Member Login matches the previous requested wallet login structure and keeps existing authentication behavior.
Project validation passes with no introduced errors.