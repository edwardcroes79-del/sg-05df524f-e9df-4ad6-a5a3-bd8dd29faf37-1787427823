---
title: Customer registration partial-failure recovery
status: done
priority: urgent
type: bug
tags: [customer-registration, auth, supabase, recovery]
created_by: agent
created_at: 2026-11-25T19:48:46Z
position: 305
---
## Notes
Investigate and fix the current customer registration bug where the first signup attempt fails after account creation, and the second attempt reports that the email already exists. Identify the exact failing step after Supabase Auth account creation, make the smallest safe fix, preserve automatic login and QR membership routing, and prevent duplicate profiles or memberships. Do not modify protected stamping functionality, unrelated auth flows, or production data.

Confirmed root cause from the active code and schema:
- `src/pages/auth/customer.tsx` creates the auth user through `supabase.auth.signUp(...)`, then immediately calls `ensureCustomerRecord(...)`.
- `src/services/customerMembershipService.ts` was using `.insert(...).select(...).single()` on `customers` and `customer_loyalty_cards`.
- Schema evidence shows these tables have separate INSERT and SELECT policies, so the write could succeed while the returning-row read failed under RLS, causing the first attempt to look like a full registration failure even though the auth account already existed.
- The second attempt then correctly hit the duplicate-email path because the Auth account had already been created.

## Checklist
- [x] Inspect the current customer signup flow across auth signup, customer-profile creation, membership creation, and redirect handling
- [x] Identify the exact step that fails after Auth account creation and document the evidence
- [x] Fix partial-registration recovery so existing newly-created accounts can continue safely without creating duplicates
- [x] Improve customer-facing error handling for duplicate-account and incomplete-registration scenarios
- [x] Preserve QR-context-driven membership creation and redirect to the correct loyalty card
- [x] Validate with check_for_errors

## Acceptance
A new customer can register successfully without getting stuck in a partial-account state.
If Auth account creation succeeds but a later step fails, the customer can recover safely without creating another account.
Repeated registration attempts do not create duplicate profiles or memberships.