---
title: Login UI regression restoration
status: in_progress
priority: urgent
type: bug
tags: [auth, ui-regression, login, customer-login]
created_by: agent
created_at: 2026-10-07T17:13:37Z
position: 142
---

## Notes
Reopened after live verification showed the previous attempt did not visibly change the rendered Business Login or Customer/Member Login screens. The fix must now trace the actual production routes/components and identify why the expected login UI is not visible before restoring the previous UI.

Must inspect:
- Business Login actual route and rendered page/component.
- Customer/Member Login actual route and rendered page/component.
- Imported components, conditional rendering, loading/auth states, duplicated auth pages, mobile/desktop variants, redirects, CSS/classes, and caching/build causes.

Do not change authentication logic, Supabase Auth, registration, password reset, email verification, redirects, roles, or business/customer auth behavior.

## Checklist
- [x] Inspect current Business Login and Customer/Member Login pages and related auth UI dependencies
- [x] Identify why the first fix did not change the rendered UI
- [x] Trace actual rendered Business Login route, page component, imports, and conditional UI states
- [x] Trace actual rendered Customer/Member Login route, page component, imports, tabs, and conditional UI states
- [x] Restore the rendered Business Login UI with required previous design elements
- [x] Restore the rendered Customer/Member Login UI with required previous design elements
- [ ] Verify visible rendered UI for desktop/mobile and language paths as far as the environment allows
- [ ] Run project checks and report actual rendered route/component, root cause, files changed, restored UI, and verification result

## Acceptance
Business Login visibly shows RoyaltyStamp branding, Welcome Back, helper text, labels, forgot password, Sign In, and Register your business.
Customer/Member Login visibly shows RoyaltyStamp Wallet, Aruba rewards prompt, Sign In/New Account tabs, labels, forgot password, Sign In to Earn Stamps, notice, and Business Login.
Project validation passes with no introduced errors.