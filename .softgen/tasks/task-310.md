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

Investigation findings:
- The customer card layout regression was caused by the later compact-card adjustment, not by the Staff Loyalty Card Assignment feature itself.
- Git history from commit `49b01c6` confirmed the original customer-facing values in `src/components/LoyaltyCard.tsx` and `src/pages/customer/cards.tsx`.
- The affected changes were banner aspect ratio, card content padding, minimum height, header spacing, logo sizing, title sizing, stamp-count positioning, stamp-grid spacing, reward section spacing, details spacing, card list gap, and highlight ring offset.

Restoration in progress:
- Reverted the customer-facing layout values in `src/components/LoyaltyCard.tsx` to the pre-staff-assignment version from git history.
- Reverted the customer cards page spacing in `src/pages/customer/cards.tsx` to the pre-staff-assignment version from git history.
- Preserved later functional behavior that is unrelated to design restoration, including highlighted-card routing and all staff assignment functionality.

## Checklist
- [x] Inspect the current customer loyalty card component and customer cards page
- [x] Compare the customer card files against the pre-staff-assignment git version
- [x] Restore the original customer-facing layout values exactly where they changed
- [x] Preserve highlighted-card behavior and all customer/staff workflows
- [ ] Validate build/runtime behavior after the restoration

## Acceptance
The customer loyalty card matches the original customer-facing design from before the Staff Loyalty Card Assignment feature work.
Staff assignment, staff stamping restrictions, and all server-side authorization remain unchanged.