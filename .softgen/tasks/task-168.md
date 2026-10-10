---
title: Password Recovery URL Correction
status: done
priority: urgent
type: bug
tags: [auth, password-recovery, redirects]
created_by: agent
created_at: 2026-10-10T15:52:51Z
position: 168
---

## Notes
Implemented the approved minimal `getURL()` domain correction for password recovery and related Supabase Auth redirect callers. `https://royaltystamp.com` is now the canonical fallback instead of the legacy `https://arubaroyaltystamp.com`. Live browser origins for `https://royaltystamp.com` and `https://www.royaltystamp.com` remain preserved. Softgen preview, localhost, 127.0.0.1, and legacy-domain cases are forced to the canonical production domain. SMTP, registration APIs, Turnstile, Supabase settings, templates, database objects, RLS, and unrelated auth logic were not modified.

## Checklist
- [x] Review `getURL()` callers in `src/pages/auth/reset-password.tsx`, `src/services/authService.ts`, and `src/pages/auth/register.tsx`
- [x] Update only `getURL()` with the canonical production fallback and legacy/preview/local rewrite
- [x] Preserve `/auth/update-password` recovery route and existing Supabase recovery-session handling
- [x] Preserve signup confirmation behavior except necessary domain correction
- [x] Run TypeScript/lint validation and report redirect outcomes

## Acceptance
Password recovery and Supabase Auth redirect helpers no longer generate the legacy `arubaroyaltystamp.com` redirect. Production `royaltystamp.com` and `www.royaltystamp.com` browser origins remain supported. No unrelated authentication or infrastructure settings are changed.