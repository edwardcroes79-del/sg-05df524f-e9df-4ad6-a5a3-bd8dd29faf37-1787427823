---
title: Password reset translations
status: done
priority: urgent
type: bug
tags: [auth, password-reset, i18n]
created_by: agent
created_at: 2026-10-10T00:23:31Z
position: 163
---

## Checklist
- [x] Inspect `src/pages/auth/reset-password.tsx` for all visible reset-page translation keys and auth behavior
- [x] Inspect `src/lib/i18n.ts` for existing `auth.reset.*` entries in English, Spanish, and Papiamento
- [x] Add or correct missing reset translation entries using the existing i18n dictionaries
- [x] Preserve form submission, validation, loading, success, error, and Sign In navigation behavior
- [x] Verify no raw `auth.reset.*`, `dashboard.*`, `admin.*`, or other translation keys remain on the password reset page
- [x] Run project checks and report root cause, changed files, languages covered, and tests actually performed

## Acceptance
English, Spanish, and Papiamento show readable password reset page text.
Existing password reset submission, success/error handling, and Sign In link remain unchanged.
No raw translation keys are visible on the password reset page.