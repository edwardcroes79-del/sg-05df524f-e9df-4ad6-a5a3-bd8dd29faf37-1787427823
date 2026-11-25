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

## Checklist
- [ ] Inspect customer registration page and registration API flow
- [ ] Inspect customer login flow and any remaining email-verification gates
- [ ] Inspect QR return-context preservation and post-auth redirect behavior
- [ ] Confirm whether automatic login was implemented anywhere
- [ ] Determine what can and cannot be confirmed about live Supabase email confirmation settings from available evidence
- [ ] Report exact cause, responsible files, safest solution, and affected account types