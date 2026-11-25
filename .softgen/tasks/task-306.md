---
title: Customer registration Turnstile restoration
status: done
priority: urgent
type: bug
tags: [security, customer-registration, turnstile]
created_by: agent
created_at: 2026-11-25T20:04:09Z
position: 306
---
## Notes
Restore the existing Cloudflare Turnstile security verification on the customer registration page without rewriting the working registration, automatic login, QR context, customer membership creation, or protected stamping functionality. Reuse the existing Turnstile integration, server-side verification, and configuration wherever possible. The widget must appear below the password field and above the create-account button, require successful verification before signup, and reset after failed verification or failed registration attempts.

Implemented scope:
- Reused `TurnstileVerification` on the customer signup form in the original placement under the password field.
- Restored required Turnstile verification before customer signup can proceed.
- Reused the shared server-side Turnstile helper in `src/lib/server/turnstile.ts` and converted `/api/auth/register-customer` into a lightweight verification preflight that runs before Supabase signup.
- Added widget reset behavior after failed verification or failed registration attempts.
- Preserved the current automatic login, QR return routing, customer profile creation, and loyalty-card redirect flow.

## Checklist
- [x] Inspect the existing Turnstile component, customer registration page, and current server-side verification helper/API flow
- [x] Re-add the Turnstile widget to the customer registration form in the original placement
- [x] Require a valid Turnstile token before customer signup can proceed
- [x] Verify the token server-side before creating the Supabase Auth account
- [x] Reset the widget after failed verification or failed registration attempts
- [x] Preserve automatic login, QR context, customer profile creation, and loyalty-card redirect behavior
- [x] Validate with check_for_errors

## Acceptance
The customer registration page shows the Cloudflare Turnstile widget under the password field and above the submit button.
Customer registration is blocked until Turnstile verification succeeds and invalid or expired tokens are rejected server-side.
Automatic customer login and correct loyalty-card access still work after successful registration.