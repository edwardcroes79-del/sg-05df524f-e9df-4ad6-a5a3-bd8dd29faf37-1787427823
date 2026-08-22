---
title: Configure Production SMTP and Email Flows
status: in_progress
priority: urgent
type: feature
tags: [smtp, auth, email, production]
created_by: agent
created_at: 2026-08-20T19:50:00Z
position: 31
---

## Notes
- Prepare the application to use a custom SMTP provider for Supabase Auth.
- Ensure `redirectTo` logic in registration and password resets correctly points to the production URL.
- Configure Supabase Auth SMTP settings securely.
- Update email templates and Site URL.

## Checklist
- [x] Inspect and update `redirectTo` parameters in frontend auth files
- [x] Request SMTP credentials and Production URL from the user
- [x] Configure Supabase Auth Site URL and Redirect URLs
- [x] Apply secure SMTP configuration via Supabase Auth settings
- [x] Deliver summary and wait for user testing