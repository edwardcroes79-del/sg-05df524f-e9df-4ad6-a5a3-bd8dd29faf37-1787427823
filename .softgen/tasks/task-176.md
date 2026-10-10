---
title: Password Reset UI and Role Redirects
status: in_progress
priority: high
type: bug
tags: [auth, password-reset, localization, routing]
created_by: agent
created_at: 2026-10-10T19:27:14Z
position: 176
---

## Notes
Fix the password-update page presentation and post-reset navigation only. The deployed recovery email flow is working and must not be changed. Inspect localization and auth routes before changes. Replace visible untranslated `auth.update.*` keys with proper translated strings in supported languages, preserve branding and validation, keep Supabase recovery-token/password update logic intact, and route users after successful password update to the correct login page based on verified existing account data. Do not modify SMTP recovery delivery, recovery-token generation, registration, login behavior, RLS, or deployment settings.

## Checklist
- [ ] Inspect update-password page, i18n keys, customer/member login route, business login route, and existing role/account metadata usage
- [ ] Add missing password-update translations with safe fallback behavior across supported languages
- [ ] Update password-update form labels, placeholders, helper text, loading state, and validation messaging without raw keys
- [ ] Implement safe post-reset login destination selection for members/customers and business users using existing verified account data
- [ ] Validate with static checks and inspect that SMTP recovery delivery code remains unchanged

## Acceptance
The password-update page no longer displays raw localization keys. Customers/members are sent to the member login route after password update, business users are sent to the business login route, and ambiguous cases fall back safely without granting access.