---
title: Simplified customer registration
status: in_progress
priority: urgent
type: feature
tags: [customer-registration, auth, qr-context]
created_by: agent
created_at: 2026-11-25T18:03:55Z
position: 300
---
## Notes
Implement Phase 2 simplified customer registration using the existing customer auth architecture. Limit the registration form to full name, email address, and password. Preserve QR return context, current customer profile relationships, and existing stamping functionality. Do not change Supabase auth settings, business/staff/superadmin auth flows, or protected stamping systems.

## Checklist
- [ ] Inspect the current customer auth page and registration API implementation details
- [ ] Simplify the customer registration UI to require only full name, email address, and password
- [ ] Preserve existing QR/business/program return context through registration
- [ ] Improve customer-facing validation and duplicate-email error handling without exposing internals
- [ ] Preserve customer profile creation and duplicate-prevention behavior in the existing API flow
- [ ] Validate simplified registration with check_for_errors

## Acceptance
Customers can submit registration with only full name, email address, and password.
QR-based registration still preserves the original join context.
Existing stamping functionality and non-customer authentication flows remain unchanged.