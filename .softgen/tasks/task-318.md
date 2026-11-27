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

## Checklist
- [ ] Inspect the current customer registration success handler and QR return flow
- [ ] Compare with the previous working implementation in git history
- [ ] Restore direct post-registration enrollment and dashboard redirect
- [ ] Keep Business Admin preview read-only on the public join page
- [ ] Validate existing customer login still works
- [ ] Run check_for_errors

## Acceptance
A new customer who registers from a QR flow is enrolled in the selected loyalty program and redirected directly to the Customer Dashboard.
No intermediate loyalty-card page or extra "Add to My Wallet" click appears after registration.