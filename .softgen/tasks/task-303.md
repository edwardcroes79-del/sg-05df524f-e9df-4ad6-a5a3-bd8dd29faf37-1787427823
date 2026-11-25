---
title: Customer email verification investigation
status: in_progress
priority: urgent
type: bug
tags: [customer-registration, auth, investigation, supabase]
created_by: agent
created_at: 2026-11-25T19:12:39Z
position: 303
---
## Notes
Investigate why customers still must verify email before login after the registration improvements. Do not change code, auth settings, database data, or protected stamping functionality in this phase. Confirm the exact cause in the current customer registration and authentication flow, identify responsible files, determine whether Phase 3 was actually implemented, and document whether Supabase email confirmation is globally shared across account types.

Confirmed findings:
- Customer registration still uses `supabaseAdmin.auth.admin.generateLink({ type: "signup" ... })` in `src/pages/api/auth/register-customer.ts`.
- The registration API sets `redirectTo` to `/auth/customer?confirmed=true&returnUrl=...` and sends a custom SMTP verification email.
- `src/pages/auth/customer.tsx` does not establish a session after signup; it only shows a success state and tells the user to verify email.
- Customer sessions are still created only through explicit `supabase.auth.signInWithPassword(...)` in `src/pages/auth/customer.tsx`.
- QR context is preserved through `returnUrl`, but `src/pages/join/[id].tsx` still performs membership creation later and routes to `/customer`, not directly to a specific loyalty card.
- No evidence was found that Phase 3 automatic login was implemented in the active codepath.
- The live Supabase dashboard “Confirm email” toggle could not be directly inspected from the available tools. Because auth is shared across customers, business owners/admins, staff, and super admins, any change to global email confirmation must be treated as cross-account-impacting until explicitly confirmed otherwise.

## Checklist
- [x] Inspect customer registration page and registration API flow
- [x] Inspect customer login flow and any remaining email-verification gates
- [x] Inspect QR return-context preservation and post-auth redirect behavior
- [x] Confirm whether automatic login was implemented anywhere
- [x] Determine what can and cannot be confirmed about live Supabase email confirmation settings from available evidence
- [x] Report exact cause, responsible files, safest solution, and affected account types