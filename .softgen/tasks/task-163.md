---
title: Password reset translations
status: in_progress
priority: urgent
type: bug
tags: [auth, password-reset, i18n]
created_by: agent
created_at: 2026-10-10T00:24:06Z
position: 163
---

## Notes
The password reset page is displaying raw translation keys such as `auth.reset.title`, `auth.reset.description`, `auth.reset.businessEmail`, `auth.reset.emailPlaceholder`, `auth.reset.sendLink`, and `auth.reset.rememberPassword`. This task is strictly an i18n/UI text fix. Do not change Supabase Auth calls, password reset redirect URLs, token generation, SMTP/email behavior, login/session handling, auth APIs, database functions, or security policies. Use the existing translation architecture for English, Spanish, and Aruba Papiamento.

## Checklist
- [x] Inspect `src/pages/auth/reset-password.tsx` for all visible reset-page translation keys and auth behavior
- [x] Inspect `src/lib/i18n.ts` for existing `auth.reset.*` entries in English, Spanish, and Papiamento
- [x] Add or correct missing reset translation entries using the existing i18n dictionaries
- [x] Preserve form submission, validation, loading, success, error, and Sign In navigation behavior
- [x] Verify no raw `auth.reset.*`, `dashboard.*`, `admin.*`, or other translation keys remain on the password reset page
- [ ] Run project checks and report root cause, changed files, languages covered, and tests actually performed

## Acceptance
The password reset page shows readable translated text in English, Spanish, and Papiamento.
The existing password reset submission flow and Sign In link remain unchanged.
No raw translation keys are visible on the password reset page.