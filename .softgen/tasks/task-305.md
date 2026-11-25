---
title: Customer registration partial-failure recovery
status: in_progress
priority: urgent
type: bug
tags: [customer-registration, auth, supabase, recovery]
created_by: agent
created_at: 2026-11-25T19:48:46Z
position: 305
---
## Notes
Investigate and fix the current customer registration bug where the first signup attempt fails after account creation, and the second attempt reports that the email already exists. Identify the exact failing step after Supabase Auth account creation, make the smallest safe fix, preserve automatic login and QR membership routing, and prevent duplicate profiles or memberships. Do not modify protected stamping functionality, unrelated auth flows, or production data.

## Checklist
- [ ] Inspect the current customer signup flow across auth signup, customer-profile creation, membership creation, and redirect handling
- [ ] Identify the exact step that fails after Auth account creation and document the evidence
- [ ] Fix partial-registration recovery so existing newly-created accounts can continue safely without creating duplicates
- [ ] Improve customer-facing error handling for duplicate-account and incomplete-registration scenarios
- [ ] Preserve QR-context-driven membership creation and redirect to the correct loyalty card
- [ ] Validate with check_for_errors

## Acceptance
A new customer can register successfully without getting stuck in a partial-account state.
If Auth account creation succeeds but a later step fails, the customer can recover safely without creating another account.
Repeated registration attempts do not create duplicate profiles or memberships.