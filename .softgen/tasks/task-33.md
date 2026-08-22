---
title: Fix Registration Email Rate Limit Exceeded
status: in_progress
priority: urgent
type: bug
tags: [auth, registration, rate-limit]
created_by: agent
created_at: 2026-08-22T20:12:48Z
position: 33
---

## Notes
- User reported "email rate limit exceeded" during registration.
- Need to determine if Supabase Auth or Titan SMTP is rate limiting.
- Need to prevent duplicate frontend submissions (double-clicks).
- Need to improve the UX for rate limit errors.
- Do not disable email confirmation.

## Checklist
- [ ] Inspect `register.tsx` for duplicate submission vulnerabilities.
- [ ] Add strict loading state checks to prevent double-clicks.
- [ ] Improve error handling to show a clear "Too Many Requests" message instead of a generic failure.
- [ ] Check if the account is actually created when this error occurs.
- [ ] Verify if a "Resend Confirmation" cooldown is needed.
- [ ] Run build and check for errors.
- [ ] Deliver debug report and wait for instructions.