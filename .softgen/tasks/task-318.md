---
title: Customer registration direct dashboard redirect
status: in_progress
priority: urgent
type: bug
tags: [customer-registration, qr-flow, auth, dashboard]
created_by: agent
created_at: 2026-11-27T16:40:15Z
position: 318
---
## Notes
Restore the previously approved QR customer registration flow: after a new customer creates an account from a business QR code, the customer must be enrolled in the selected loyalty program and redirected directly to the Customer Dashboard without any intermediate loyalty-card page or "Add to My Wallet" step.

Scope:
- Keep Business Admin preview behavior intact on the public join page.
- Preserve customer login, QR routing, enrollment, and dashboard behavior.
- Do not modify business/admin areas, customer roles, or dashboard design.
- Make the smallest possible change based on the current registration success handler and git history.

Investigation findings:
- `src/pages/join/[id].tsx` now correctly stays read-only for Business Admin/staff previews and only shows the public CTA.
- The extra wallet step for real customers is now caused by `src/pages/auth/customer.tsx`: `routeSignedInUser(...)` sends authenticated customer accounts back to `safeReturnUrl`, which for QR flows is `/join/:programId`.
- Because customers are returned to the public join page instead of being enrolled during the auth return flow, they now see the intermediate public card page and the `Add to My Wallet` button before reaching dashboard.
- Git history shows the simplified redirect/join behavior was previously handled as part of the QR auth flow, not as a required extra click on the public preview.

Restoration approach:
- Detect QR join return URLs in `src/pages/auth/customer.tsx`.
- After successful customer sign-in/sign-up/MFA completion, complete `ensureCustomerJoinForProgram(...)` there and redirect directly to `/customer/cards?cardId=...`.
- Leave non-QR auth returns unchanged.
- Leave Business Admin preview behavior on `src/pages/join/[id].tsx` unchanged and read-only.

## Checklist
- [x] Inspect the current customer registration success handler and QR return flow
- [x] Compare with the previous working implementation in git history
- [x] Restore direct post-registration enrollment and dashboard redirect
- [x] Keep Business Admin preview read-only on the public join page
- [ ] Validate existing customer login still works
- [ ] Run check_for_errors

## Acceptance
A new customer who registers from a QR flow is enrolled in the selected loyalty program and redirected directly to the Customer Dashboard.
No intermediate loyalty-card page or extra "Add to My Wallet" click appears after registration.