---
title: Business registration translations
status: done
priority: urgent
type: bug
tags: [auth, registration, i18n]
created_by: agent
created_at: 2026-10-08T18:07:06Z
position: 160
---

## Checklist
- [x] Audit `src/pages/auth/register.tsx` for all visible registration text and translation key usage
- [x] Audit `src/lib/i18n.ts` for existing registration translation entries in English, Spanish, and Papiamento
- [x] Add or correct missing registration translation entries using the existing i18n dictionary
- [x] Keep validation, error, success, loading, and navigation messages translated without raw keys
- [x] Verify no visible `auth.register.*`, `dashboard.*`, `admin.*`, or other raw keys remain on the registration page
- [x] Run project checks and report files changed plus English, Spanish, and Papiamento coverage