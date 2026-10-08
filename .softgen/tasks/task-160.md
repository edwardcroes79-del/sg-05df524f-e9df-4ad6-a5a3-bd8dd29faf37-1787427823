---
title: Business registration translations
status: in_progress
priority: urgent
type: bug
tags: [auth, registration, i18n]
created_by: agent
created_at: 2026-10-08T18:07:06Z
position: 160
---

## Notes
The Business Registration page is showing raw translation keys such as `auth.register.createAccount`, `auth.register.businessDescription`, `auth.register.businessEmail`, `auth.register.emailPlaceholder`, `auth.register.password`, `auth.register.passwordHelp`, `auth.register.alreadyHaveAccount`, and `auth.register.signIn`. Fix only the registration page translation mapping through the existing i18n system. Do not change authentication behavior, Supabase Auth, SMTP/email flow, validation logic, approval flow, unrelated pages, translation keys used by other pages, or business logic. English, Spanish, and Papiamento must all show user-facing text and never raw keys.

## Checklist
- [x] Audit `src/pages/auth/register.tsx` for all visible registration text and translation key usage
- [x] Audit `src/lib/i18n.ts` for existing registration translation entries in English, Spanish, and Papiamento
- [x] Add or correct missing registration translation entries using the existing i18n dictionary
- [x] Keep validation, error, success, loading, and navigation messages translated without raw keys
- [x] Verify no visible `auth.register.*`, `dashboard.*`, `admin.*`, or other raw keys remain on the registration page
- [ ] Run project checks and report files changed plus English, Spanish, and Papiamento coverage

## Acceptance
The Business Registration page displays proper translated text in English, Spanish, and Papiamento.
No raw translation keys appear on the registration page.
Registration functionality and authentication flow remain unchanged.