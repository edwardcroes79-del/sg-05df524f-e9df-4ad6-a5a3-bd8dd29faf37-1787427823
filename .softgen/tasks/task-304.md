---
title: Automatic customer login and loyalty card access
status: done
priority: urgent
type: feature
tags: [customer-registration, auth, qr-context, loyalty-card]
created_by: agent
created_at: 2026-11-25T19:30:00Z
position: 304
---
## Notes
Implement the missing Phase 3 customer authentication flow using the existing Supabase architecture and the confirmed live setting that Auto-confirm Email is enabled. Replace the confirmation-first customer signup behavior with a supported sign-up flow that establishes a real session, preserves QR return context, completes or confirms the correct loyalty membership, and opens the correct loyalty card without modifying protected stamping functionality.

Constraints:
- Do not modify staff, business admin, or superadmin authentication behavior.
- Do not modify protected stamping components, stamp transactions, rewards, or related RLS.
- Reuse existing tables and relationships. No destructive migrations.
- Preserve existing customer accounts and memberships.
- Existing unverified customers must be handled safely without manual verification bypass.

Implemented scope:
- Customer signup now uses the supported client-side Supabase sign-up session flow instead of the confirmation-link-only path.
- Customer profile creation/reuse and loyalty-card creation/reuse are centralized in a shared client service with duplicate-safe fallbacks.
- QR join flow now auto-completes membership for authenticated customers and redirects directly to the specific loyalty card.
- Customer card page now accepts a `cardId` query parameter to focus the intended card after signup or login.
- Existing older unverified accounts are not bypassed; they continue to use the safe existing verification or password-recovery path.

## Checklist
- [x] Inspect customer auth session creation, customer-row sync, and join/card routing constraints
- [x] Replace confirmation-link customer signup with supported automatic session creation
- [x] Preserve or create the customer record safely after signup without duplicating profiles
- [x] Preserve QR context and auto-complete the correct loyalty program connection
- [x] Redirect to the correct loyalty card immediately after signup or login
- [x] Verify duplicate-account and duplicate-membership handling
- [x] Validate build/runtime behavior with check_for_errors

## Acceptance
A new customer can register with name, email, and password and receive a legitimate authenticated session immediately.
QR-based signup or login connects the customer to the correct loyalty program and opens the correct loyalty card without a second manual login.
Business, staff, superadmin, and stamping behavior remain unchanged.