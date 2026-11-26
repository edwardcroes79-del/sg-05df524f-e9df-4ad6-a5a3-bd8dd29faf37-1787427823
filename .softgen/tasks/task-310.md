---
title: Compact customer loyalty card view
status: in_progress
priority: high
type: bug
tags: [customer, loyalty-card, mobile, ui]
created_by: agent
created_at: 2026-11-26T11:31:00Z
position: 310
---
## Notes
Restore the exact original customer-facing loyalty card layout from immediately before the Staff Loyalty Card Assignment feature was introduced. Preserve all staff assignment functionality, database authorization, and stamping flows. Match the provided original screenshot as closely as possible by restoring the actual prior implementation rather than approximating with new spacing changes.

Active investigation:
- Compare the current customer-facing card against the two uploaded screenshots.
- Recover the exact pre-staff-assignment implementation from git history for `src/components/LoyaltyCard.tsx` and `src/pages/customer/cards.tsx`.
- Confirm whether the regression came from later customer-card tweaks or from any shared component changes introduced alongside staff assignment.
- Restore only customer presentation while leaving staff assignment, Quick Issue Stamp, normal Issue Stamp, and server-side authorization intact.

## Checklist
- [x] Inspect the current customer loyalty card component and customer cards page
- [x] Compare the customer card files against the pre-staff-assignment git version
- [ ] Compare the restored code directly against the provided screenshots
- [ ] Restore the exact original customer-facing implementation from immediately before staff assignment
- [ ] Preserve highlighted-card behavior and all customer/staff workflows
- [ ] Validate build/runtime behavior after the restoration

## Acceptance
The customer loyalty card matches the original customer-facing design from before the Staff Loyalty Card Assignment feature work and aligns with the provided original screenshot.
Staff assignment, staff stamping restrictions, and all server-side authorization remain unchanged.