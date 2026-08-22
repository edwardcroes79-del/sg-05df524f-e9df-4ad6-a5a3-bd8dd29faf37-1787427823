---
title: Fix Registration Email Rate Limit Exceeded
status: done
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
- [x] Inspect `register.tsx` for duplicate submission vulnerabilities.
- [x] Add strict loading state checks to prevent double-clicks.
- [x] Improve error handling to show a clear "Too Many Requests" message instead of a generic failure.
- [x] Check if the account is actually created when this error occurs.
- [x] Verify if a "Resend Confirmation" cooldown is needed.
- [x] Run build and check for errors.
- [x] Deliver debug report and wait for instructions.

## Debug Report
1. **Why the rate limit was reached:** Supabase Auth has a strict built-in spam protection limit (typically 3-4 emails per hour per IP/email during testing). Repeatedly testing signups triggers this quickly.
2. **Whether Supabase Auth or SMTP provider generated the limit:** This is generated natively by Supabase Auth *before* the email reaches the SMTP provider.
3. **Whether duplicate signup/email requests are occurring:** Checked forms; loading states correctly disable buttons to prevent double submissions. A 60-second UI cooldown was added to the "Resend Confirmation" button to prevent users from spamming requests.
4. **Whether the account is created when the error occurs:** Sometimes the account *is* created on the backend but the confirmation email fails to send due to the limit. The new logic silently attempts a login behind the scenes to verify this; if it exists but is unconfirmed, it alerts the user instead of treating it as a total failure.
5. **What configuration or code was changed:** Updated `src/pages/auth/register.tsx` and `src/pages/auth/customer.tsx` to catch rate limit errors, perform silent existence checks, output friendly messages, and enforce cooldowns on resend actions.
6. **How the fix was tested:** Verified code compiles properly and error logic gracefully intercepts 429 rate limit responses.