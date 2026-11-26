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
Restore the original customer-facing loyalty card layout exactly as it appeared before the Staff Loyalty Card Assignment feature work. Preserve the staff assignment database changes, staff restrictions, and server-side authorization. This is a customer UI restoration only.

Investigation target:
- Compare `src/components/LoyaltyCard.tsx` and `src/pages/customer/cards.tsx` against the pre-staff-assignment implementation from git history.
- Identify the exact customer-facing layout changes introduced by the later compact-card adjustment.
- Restore the original banner height, card proportions, spacing, typography, centering, and mobile responsiveness without affecting staff workflows.

## Checklist
- [x] Inspect the current customer loyalty card component and customer cards page
- [ ] Compare the customer card files against the pre-staff-assignment git version
- [ ] Restore the original customer-facing layout values exactly where they changed
- [ ] Preserve highlighted-card behavior and all customer/staff workflows
- [ ] Validate build/runtime behavior after the restoration

## Acceptance
The customer loyalty card matches the original customer-facing design from before the Staff Loyalty Card Assignment feature work.
Staff assignment, staff stamping restrictions, and all server-side authorization remain unchanged.