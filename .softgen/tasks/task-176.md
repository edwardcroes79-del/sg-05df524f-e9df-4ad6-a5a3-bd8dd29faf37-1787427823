---
title: Password Reset UI and Role Redirects
status: done
priority: high
type: bug
tags: [auth, password-reset, localization, routing]
created_by: agent
created_at: 2026-10-10T19:27:14Z
position: 176
---

## Notes
Fix the password-update page presentation and post-reset navigation only. The deployed recovery email flow is working and must not be changed. Inspected localization and auth routes before changes. Added `auth.update.*` translations for English, Spanish, and Papiamento, added page-level fallback copy to prevent raw localization keys if a translation is missing, preserved Supabase recovery-session password update behavior, and route users after successful password update based on existing account data: `profiles.role = customer` or an own customer row routes to `/auth/customer`; Super Admin, business staff, business membership, and ambiguous fallback route to `/auth/login`. This destination never grants access and happens only after Supabase password update succeeds and the recovery session is signed out. SMTP recovery delivery, recovery-token generation, registration, login behavior, RLS, and deployment settings were not modified. Static checks passed with no CSS, linting, type checking, or server errors.

## Checklist
- [x] Inspect update-password page, i18n keys, customer/member login route, business login route, and existing role/account metadata usage
- [x] Add missing password-update translations with safe fallback behavior across supported languages
- [x] Update password-update form labels, placeholders, helper text, loading state, and validation messaging without raw keys
- [x] Implement safe post-reset login destination selection for members/customers and business users using existing verified account data
- [x] Validate with static checks and inspect that SMTP recovery delivery code remains unchanged

## Acceptance
The password-update page no longer displays raw localization keys. Customers/members are sent to the member login route after password update, business users are sent to the business login route, and ambiguous cases fall back safely without granting access.