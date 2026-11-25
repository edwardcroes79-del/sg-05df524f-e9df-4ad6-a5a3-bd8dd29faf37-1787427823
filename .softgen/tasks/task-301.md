---
title: Automatic customer login and loyalty card access
status: in_progress
priority: urgent
type: feature
tags: [customer-registration, auth, qr-context, loyalty-card]
created_by: agent
created_at: 2026-11-25T18:12:28Z
position: 301
---
## Notes
Implement Phase 3 only if it can be done safely within the existing Supabase authentication architecture. Preserve QR context, existing customer memberships, and all stamping functionality. If customer-only email verification cannot be isolated safely from shared auth, stop and report the limitation before any global auth change.

## Checklist
- [ ] Inspect the current post-registration auth flow and Phase 1 findings
- [ ] Confirm whether immediate customer login is possible without unsafe global auth changes
- [ ] Preserve or improve QR-context-driven loyalty card routing
- [ ] Implement safe automatic login only within approved auth constraints
- [ ] Validate existing customer login and membership behavior
- [ ] Validate with check_for_errors

## Acceptance
New customers can reach the correct loyalty card immediately after registration only if supported safely by the current auth setup.
Existing business, staff, superadmin, and stamping behavior remains unchanged.